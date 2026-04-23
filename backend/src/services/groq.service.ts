import Groq from "groq-sdk";
import { RagContext } from "./rag.service";
import { env } from "../common/env";
import { withRetry } from "../common/retry";
import { ErpService } from "./erp.service";
import { prisma } from "../config/db";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

interface ChatMessageInput {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | any;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

/**
 * Build the system prompt with optional RAG context
 */
const buildSystemPrompt = (context: RagContext[], currentUserDivision: string | null, erpMode: string = "DB"): string => {
  const contextString = context
    .map((c, i) => `<document index="${i + 1}" source="${c.source}">\n${c.content}\n</document>`)
    .join("\n\n");

  const hasContext = context.length > 0;

  return `Anda adalah ACS AI Assistant — asisten kecerdasan buatan yang canggih, membantu, dan akurat.

<role>
- Anda adalah asisten serba bisa yang bisa menjawab pertanyaan umum, membantu analisis, memberikan saran, dan berdiskusi seperti AI Assistant modern (ChatGPT, Gemini, Claude).
- Anda harus ramah, informatif, dan memberikan jawaban yang terstruktur.
</role>

<rules>
1. Selalu jawab dalam bahasa yang sama dengan bahasa pengguna.
2. Gunakan format Markdown untuk jawaban yang terstruktur (heading, list, bold, code block, dll).
3. Jika pengguna bertanya hal umum (coding, matematika, penjelasan konsep), jawab dengan pengetahuan Anda.
4. Jika ada <context> di bawah, prioritaskan informasi dari <context> tersebut dan sertakan sitasi [Sumber X] berdasarkan atribut source.
5. Jika pengguna bertanya tentang data spesifik dan TIDAK ADA konteks dokumen pendukung, jelaskan bahwa data tersebut belum tersedia di database.
6. JANGAN PERNAH mengarang data, angka, atau statistik spesifik. Untuk pertanyaan umum yang tidak terkait data internal, Anda boleh menjawab menggunakan pengetahuan umum.
7. [PENTING] Jika pengguna secara eksplisit meminta Anda untuk membuat file, mengekspor, atau mengunduh output dalam bentuk dokumen (khususnya format pdf, docx, xlsx, pptx, csv, atau md), Anda HARUS menyisipkan blok data khusus di BAGIAN PALING AKHIR respons Anda dengan format XML persis seperti ini (tanpa backtick markdown):
<EXPORT_DATA>{"format": "pdf", "title": "Nama_File_Tanpa_Spasi", "content": "Isi lengkap dari dokumen dalam format teks/markdown..."}</EXPORT_DATA>
Pilihan format yang didukung HANYA: pdf, docx, xlsx, pptx, csv, md. Pastikan isi JSON di-escape dengan benar.
</rules>

<format>
- Gunakan Markdown dengan heading (##), bullet points, bold (**teks**), dan code blocks sesuai kebutuhan.
- Untuk penjelasan panjang, bagi menjadi beberapa bagian yang terstruktur.
- Berikan jawaban yang lengkap namun padat dan jelas.
- Saat menjawab tentang data perusahaan (gaji, karyawan, divisi), JANGAN asumsikan angka, panggil ALWAYS function \`${erpMode === 'DB' ? 'query_erp_sql' : 'query_erp_api'}\`.
</format>

<database>
${erpMode === 'DB' ? ErpService.getErpSchemaInfo() : ErpService.getErpApiInfo()}

[Divisi Pengguna (Penting!)]:
Pengguna saat ini berada di divisi: ${currentUserDivision || "Global/Superadmin"}.
Jika pengguna menanyakan data seputar "karyawan divisi ini", "gaji tim", ${erpMode === 'DB' ? `otomatis gunakan klausa WHERE divisionName = '${currentUserDivision || "SEMUA"}' dalam query_erp_sql Anda.` : `tambahkan query parameter divisionName='${currentUserDivision}' di dalam argumen queryParams json.`}
Jika pengguna adalah Global, LLM dapat menanyakan seluruh karyawan.
</database>

${
  hasContext
    ? `<context>
Kumpulan dokumen referensi berikut ditarik dari database berdasarkan pertanyaan pengguna:

${contextString}
</context>`
    : "<context>\nTidak ada data spesifik dari database untuk query ini. Jawab berdasarkan pengetahuan umum Anda.\n</context>"
}`;
};

/**
 * Cached ERP connection mode — avoids DB hit on every chat request.
 * Cache invalidates after 60 seconds.
 */
let _erpModeCache: { value: string; expiresAt: number } | null = null;

async function getCurrentErpMode(): Promise<string> {
  if (_erpModeCache && Date.now() < _erpModeCache.expiresAt) {
    return _erpModeCache.value;
  }
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "ERP_CONNECTION_MODE" } });
    const mode = setting?.value || "DB";
    _erpModeCache = { value: mode, expiresAt: Date.now() + 60_000 };
    return mode;
  } catch (e) {
    console.warn("[Groq] Failed to fetch ERP_CONNECTION_MODE, using cached/default.");
    return _erpModeCache?.value || "DB";
  }
}

/**
 * Check if an error is retryable (network/server errors, not auth errors)
 */
function isRetryableError(error: any): boolean {
  if (error?.name === "AbortError") return false;
  if (error?.status === 429) return true; // Rate limit → retryable
  if (error?.status && error.status >= 400 && error.status < 500) return false;
  return true;
}

/**
 * Non-streaming universal response with conversation memory
 */
export const getUniversalResponse = async (
  query: string,
  context: RagContext[],
  model: string = "openai/gpt-oss-120b",
  conversationHistory: ChatMessageInput[] = [],
  currentUserDivision: string | null = null
): Promise<any> => {
  const erpMode = await getCurrentErpMode();

  const systemPrompt = buildSystemPrompt(context, currentUserDivision, erpMode);

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => {
      if (m.role === "system") return { role: "system", content: m.content as string };
      if (m.role === "user") return { role: "user", content: m.content as any };
      if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, name: m.name, content: m.content as string };
      return {
        role: "assistant",
        content: m.content as string,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
      };
    }),
    { role: "user", content: query as any },
  ];

  const chatCompletion = await withRetry(
    () =>
      groq.chat.completions.create({
        messages,
        model: model || "openai/gpt-oss-120b",
        temperature: 0.3,
        max_tokens: 4096,
        top_p: 0.9,
        tools: (erpMode === "DB" ? erpTools : erpApiTools) as any,
      }),
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      shouldRetry: (err) => isRetryableError(err),
    },
  );

  // Check for tool calls
  const message = chatCompletion.choices[0]?.message;
  if (message?.tool_calls && message.tool_calls.length > 0) {
    const tc = message.tool_calls[0];
    if (tc.function?.name === "query_erp_sql" || tc.function?.name === "query_erp_api") {
      let dataOut;
      let queryArgs;
      try {
        queryArgs = JSON.parse(tc.function?.arguments || "{}");
        if (tc.function?.name === "query_erp_sql") {
           dataOut = await ErpService.executeReadOnlySQL(queryArgs.sql_query);
        } else {
           dataOut = await ErpService.executeMockApi(queryArgs.endpoint, queryArgs.queryParams, currentUserDivision);
        }
      } catch (err: any) {
        dataOut = { error: err.message };
      }

      messages.push(message);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function?.name,
        content: JSON.stringify(dataOut, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ),
      });

      // Follow up call
      const followup = await withRetry(
        () =>
          groq.chat.completions.create({
            messages,
            model: model || "openai/gpt-oss-120b",
            temperature: 0.3,
            max_tokens: 4096,
            top_p: 0.9,
          }),
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          shouldRetry: (err) => isRetryableError(err),
        },
      );
      
      const followupContent = followup.choices[0]?.message?.content || "";
      return { isJson: false, data: followupContent };
    }
  }

  const outputContent = chatCompletion.choices[0]?.message?.content || "";
  const output =
    typeof outputContent === "string"
      ? outputContent
      : JSON.stringify(outputContent);

  // Parse if JSON format was returned
  if (output.includes("```json")) {
    try {
      const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        return { isJson: true, data: parsed };
      }
    } catch (e) {
      console.error("[Groq Service] Failed to parse JSON from AI response:", e, "\nOriginal Content:", outputContent);
    }
  }

  return { isJson: false, data: output };
};

const erpTools = [
  {
    type: "function",
    function: {
      name: "query_erp_sql",
      description: "Execute a READ-ONLY PostgreSQL query against the Mock ERP Database to retrieve accurate structured data.",
      parameters: {
        type: "object",
        properties: {
          sql_query: {
            type: "string",
            description: "The PostgreSQL SELECT query to execute.",
          },
        },
        required: ["sql_query"],
      },
    },
  },
];

const erpApiTools = [
  {
    type: "function",
    function: {
      name: "query_erp_api",
      description: "Execute a REST API call against the Mock ERP to retrieve structured data.",
      parameters: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "The API endpoint path (e.g. /api/v1/employees).",
          },
          queryParams: {
            type: "string",
            description: "The query parameters represented as a stringified JSON.",
          },
        },
        required: ["endpoint"],
      },
    },
  },
];

/**
 * Streaming response with conversation memory (SSE)
 */
export const getStreamingResponse = async (
  query: string,
  context: RagContext[],
  model: string = "openai/gpt-oss-120b",
  conversationHistory: ChatMessageInput[] = [],
  currentUserDivision: string | null = null,
  onToken: (token: string) => void,
  onDone: () => void,
  abortSignal?: AbortSignal,
): Promise<void> => {
  const erpMode = await getCurrentErpMode();

  const systemPrompt = buildSystemPrompt(context, currentUserDivision, erpMode);

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => {
      if (m.role === "system") return { role: "system", content: m.content as string };
      if (m.role === "user") return { role: "user", content: m.content as any };
      if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, name: m.name, content: m.content as string };
      return {
        role: "assistant",
        content: m.content as string,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
      };
    }),
    { role: "user", content: query as any },
  ];

  const createStream = () =>
    groq.chat.completions.create(
      {
        messages,
        model: model || "openai/gpt-oss-120b",
        temperature: 0.3,
        max_tokens: 4096,
        top_p: 0.9,
        stream: true,
        tools: (erpMode === "DB" ? erpTools : erpApiTools) as any,
      },
      { signal: abortSignal }
    ) as any;

  let stream: any;
  try {
    stream = await withRetry(createStream, {
      maxRetries: 2,
      baseDelayMs: 500,
      shouldRetry: (err) => isRetryableError(err),
    });
  } catch (error) {
    onDone();
    return;
  }

  let functionName = "";
  let functionArgs = "";
  let toolCallId = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta;
    if (delta?.tool_calls) {
      const tc = delta.tool_calls[0];
      if (tc.id) toolCallId = tc.id;
      if (tc.function?.name) functionName += tc.function.name;
      if (tc.function?.arguments) functionArgs += tc.function.arguments;
    } else {
      const token = delta?.content || "";
      if (token) {
        onToken(token);
      }
    }
  }

  // If a tool was called, execute it and get the follow-up response
  if ((functionName === "query_erp_sql" || functionName === "query_erp_api") && functionArgs) {
    onToken(`\n\n*⏳ Mengambil data ${functionName === "query_erp_api" ? "via API Endpoint" : "langsung dari ERP Database"}...*\n`);
    let dataOut;
    let queryArgs;
    
    try {
      queryArgs = JSON.parse(functionArgs);
      if (functionName === "query_erp_sql") {
        dataOut = await ErpService.executeReadOnlySQL(queryArgs.sql_query);
      } else {
        dataOut = await ErpService.executeMockApi(queryArgs.endpoint, queryArgs.queryParams, currentUserDivision);
      }
    } catch (err: any) {
      dataOut = { error: err.message };
    }

    // Append tool call and result to history
    messages.push({
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: toolCallId,
          type: "function",
          function: { name: functionName, arguments: functionArgs },
        },
      ],
    });
    messages.push({
      role: "tool",
      tool_call_id: toolCallId,
      name: functionName,
      content: JSON.stringify(dataOut, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ),
    });

    // Make the follow-up stream call
    const createFollowupStream = () =>
      groq.chat.completions.create(
        {
          messages,
          model: model || "openai/gpt-oss-120b",
          temperature: 0.3,
          max_tokens: 4096,
          top_p: 0.9,
          stream: true,
          tools: (erpMode === "DB" ? erpTools : erpApiTools) as any,
        },
        { signal: abortSignal }
      ) as any;

    try {
      const followupStream: any = await withRetry(createFollowupStream, {
        maxRetries: 2,
        baseDelayMs: 500,
        shouldRetry: (err) => isRetryableError(err),
      });

      for await (const chunk of followupStream) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          onToken(token);
        }
      }
    } catch (err) {
      console.error("[Groq] Follow-up stream failed", err);
    }
  }

  onDone();
};

import Groq from "groq-sdk";
import { RagContext } from "./rag.service";
import { env } from "../common/env";
import { withRetry } from "../common/retry";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: { url: string };
      }>;
}

/**
 * Build the system prompt with optional RAG context
 */
const buildSystemPrompt = (context: RagContext[]): string => {
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
</rules>

<format>
- Gunakan Markdown dengan heading (##), bullet points, bold (**teks**), dan code blocks sesuai kebutuhan.
- Untuk penjelasan panjang, bagi menjadi beberapa bagian yang terstruktur.
- Berikan jawaban yang lengkap namun padat dan jelas.
</format>

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
 * Check if an error is retryable (network/server errors, not auth errors)
 */
function isRetryableError(error: any): boolean {
  if (error?.name === "AbortError") return false;
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
): Promise<any> => {
  const systemPrompt = buildSystemPrompt(context);

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => {
      if (m.role === "system")
        return {
          role: "system",
          content: m.content as string,
        };
      if (m.role === "user")
        return {
          role: "user",
          content: m.content as any,
        };
      return {
        role: "assistant",
        content: m.content as string,
      };
    }),
    { role: "user", content: query as any },
  ];

  const chatCompletion = await withRetry(
    () =>
      groq.chat.completions.create({
        messages,
        model: model || "llama3-70b-8192",
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

/**
 * Streaming response with conversation memory (SSE)
 */
export const getStreamingResponse = async (
  query: string,
  context: RagContext[],
  model: string = "openai/gpt-oss-120b",
  conversationHistory: ChatMessageInput[] = [],
  onToken: (token: string) => void,
  onDone: () => void,
  abortSignal?: AbortSignal,
): Promise<void> => {
  const systemPrompt = buildSystemPrompt(context);

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => {
      if (m.role === "system")
        return {
          role: "system",
          content: m.content as string,
        };
      if (m.role === "user")
        return {
          role: "user",
          content: m.content as any,
        };
      return {
        role: "assistant",
        content: m.content as string,
      };
    }),
    { role: "user", content: query as any },
  ];

  // Typecast the creation to tell TS we are explicitly requesting a string stream
  const createStream = () =>
    groq.chat.completions.create(
      {
        messages,
        model: model || "llama3-70b-8192",
        temperature: 0.3,
        max_tokens: 4096,
        top_p: 0.9,
        stream: true,
      },
      { signal: abortSignal }
    ) as any;

  const stream: any = await withRetry(createStream, {
    maxRetries: 2,
    baseDelayMs: 500,
    shouldRetry: (err) => isRetryableError(err),
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content || "";
    if (token) {
      onToken(token);
    }
  }

  onDone();
};

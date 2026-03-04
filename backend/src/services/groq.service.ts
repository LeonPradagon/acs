import Groq from "groq-sdk";
import dotenv from "dotenv";
import { RagContext } from "./rag.service";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Build the system prompt with optional RAG context
 */
const buildSystemPrompt = (context: RagContext[]): string => {
  const contextString = context
    .map((c, i) => `[Sumber ${i + 1}: ${c.source}]\n${c.content}`)
    .join("\n\n");

  const hasContext = context.length > 0;

  return `Anda adalah ACS AI Assistant — asisten kecerdasan buatan yang canggih, membantu, dan akurat.

PERAN UTAMA:
- Anda adalah asisten serba bisa yang bisa menjawab pertanyaan umum, membantu analisis, memberikan saran, dan berdiskusi seperti AI Assistant modern (ChatGPT, Gemini, Claude).
- Anda harus ramah, informatif, dan memberikan jawaban yang terstruktur.

ATURAN PENTING:
1. Selalu jawab dalam bahasa yang sama dengan bahasa pengguna.
2. Gunakan format Markdown untuk jawaban yang terstruktur (heading, list, bold, code block, dll).
3. Jika pengguna bertanya hal umum (coding, matematika, penjelasan konsep), jawab dengan pengetahuan Anda.
4. Jika ada KONTEKS REFERENSI di bawah, prioritaskan informasi dari konteks tersebut dan sertakan sitasi [Sumber X].
5. Jika pengguna bertanya tentang data spesifik dan TIDAK ADA konteks referensi, jelaskan bahwa data tersebut belum tersedia di database.
6. Jangan pernah mengarang data atau statistik spesifik. Untuk pengetahuan umum, Anda boleh menjawab.

FORMAT RESPONS:
- Gunakan Markdown dengan heading (##), bullet points, bold (**teks**), dan code blocks sesuai kebutuhan.
- Untuk penjelasan panjang, bagi menjadi beberapa bagian yang terstruktur.
- Berikan jawaban yang lengkap namun ringkas.

${
  hasContext
    ? `KONTEKS REFERENSI (dari database):
${contextString}`
    : "KONTEKS REFERENSI: Tidak ada data spesifik dari database untuk query ini. Jawab berdasarkan pengetahuan umum Anda."
}`;
};

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

  // Build messages array: system + history + current query
  const messages: ChatMessageInput[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: query },
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: model || "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 4096,
      top_p: 0.9,
    });

    const output = chatCompletion.choices[0]?.message?.content || "";

    // Parse if JSON format was returned
    if (output.includes("```json")) {
      try {
        const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return { isJson: true, data: parsed };
        }
      } catch (e) {
        console.warn("Failed to parse JSON from AI response.");
      }
    }

    return { isJson: false, data: output };
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error("Gagal memproses query melalui model AI.");
  }
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
): Promise<void> => {
  const systemPrompt = buildSystemPrompt(context);

  const messages: ChatMessageInput[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: query },
  ];

  try {
    const stream = await groq.chat.completions.create({
      messages,
      model: model || "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 4096,
      top_p: 0.9,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        onToken(token);
      }
    }

    onDone();
  } catch (error: any) {
    console.error("Groq Streaming Error:", error);
    throw new Error("Gagal melakukan streaming dari model AI.");
  }
};

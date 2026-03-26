import { env } from "../common/env";

export class OnyxService {
  /**
   * Cek apakah Onyx API sudah dikonfigurasi.
   */
  static get isConfigured(): boolean {
    return !!env.ONYX_API_KEY && !!env.ONYX_API_URL;
  }

  static get headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ONYX_API_KEY}`,
    };
  }

  /**
   * Membuat Sesi Chat baru di server Onyx.
   * Mengembalikan: onyx_chat_session_id (UUID string)
   */
  static async createSession(): Promise<string> {
    if (!this.isConfigured) throw new Error("Onyx API is not configured");

    const response = await fetch(`${env.ONYX_API_URL}/api/chat/create-chat-session`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        persona_id: 0, // Using default assistant
        description: "ACS Integrated Session",
      }),
    });
    
    if (!response.ok) {
        throw new Error(`Onyx API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.chat_session_id;
  }

  /**
   * Mengirim pesan ke Onyx dan membedah (parse) NDJSON Streaming dari server Onyx.
   */
  static async streamChat(
    onyxSessionId: string,
    message: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    if (!this.isConfigured) throw new Error("Onyx API is not configured");

    const response = await fetch(`${env.ONYX_API_URL}/api/chat/send-message`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        chat_session_id: onyxSessionId,
        message: message,
        persona_id: 0,
        prompt_id: 0,
        search_doc_ids: [],
        retrieval_options: { run_search: "auto" }
      }),
    });

    if (!response.ok) {
        throw new Error(`Onyx stream error: ${response.statusText}`);
    }
    
    if (!response.body) {
        throw new Error("No response body from Onyx");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (value) {
            buffer += decoder.decode(value, { stream: true });
        }
        
        // Split buffer by newline delimiter (NDJSON format stream)
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
            const line = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 1);
            
            if (line) {
                try {
                    const parsed = JSON.parse(line);
                    // Onyx streams text incrementally through the answer_piece object
                    if (parsed.answer_piece) {
                        onToken(parsed.answer_piece);
                        fullResponse += parsed.answer_piece;
                    }
                } catch (e) {
                    // Ignore partial/invalid chunks
                }
            }
            boundary = buffer.indexOf('\n');
        }

        if (done) break;
      }
    } finally {
        reader.releaseLock();
    }
    
    return fullResponse;
  }
}

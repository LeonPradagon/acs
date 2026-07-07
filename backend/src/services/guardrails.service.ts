export class GuardrailsService {
  /**
   * Basic heuristic check for prompt injection patterns.
   */
  static containsPromptInjection(query: string): boolean {
    const patterns = [
      /ignore previous instructions/i,
      /disregard all prior instructions/i,
      /you are now a/i,
      /system prompt/i,
      /developer mode/i,
      /dan\s*\(do anything now\)/i,
      /write a malicious/i,
      /bypass safety/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Scans text for Personally Identifiable Information (PII).
   * Masks NIK, Phone Numbers, Emails, etc.
   */
  static maskPII(text: string): string {
    let masked = text;
    
    // NIK (16 digits)
    masked = masked.replace(/\b\d{16}\b/g, '[REDACTED_NIK]');
    
    // Phone numbers (Indonesian typical)
    masked = masked.replace(/\b(08|\+628)\d{8,11}\b/g, '[REDACTED_PHONE]');
    
    // Email addresses
    masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
    
    // Credit cards (basic)
    masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CC]');

    return masked;
  }

  /**
   * LLM output validation to block forbidden content.
   */
  static isForbiddenOutput(text: string): boolean {
    const forbiddenPatterns = [
      /password is/i,
      /api key is/i,
      /secret key/i,
      /SELECT .* FROM users/i, // Exposing raw SQL queries
      /DROP TABLE/i,
      /<script>.*<\/script>/i // XSS injection
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Full Guardrail Validation pipeline for an input query.
   */
  static validateInput(query: string): { isValid: boolean; reason?: string } {
    if (this.containsPromptInjection(query)) {
      return { isValid: false, reason: "Query terdeteksi sebagai potensi Prompt Injection." };
    }
    return { isValid: true };
  }

  /**
   * Full Guardrail Validation and Masking pipeline for LLM output.
   */
  static validateAndSanitizeOutput(output: string): { isValid: boolean; sanitizedText: string; reason?: string } {
    if (this.isForbiddenOutput(output)) {
      return { 
        isValid: false, 
        sanitizedText: "Respon diblokir oleh Security Guardrails karena terindikasi membocorkan sistem atau mengandung eksploit.",
        reason: "Forbidden Content Detected"
      };
    }
    
    const sanitizedText = this.maskPII(output);
    return { isValid: true, sanitizedText };
  }
}

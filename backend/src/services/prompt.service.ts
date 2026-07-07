import { prisma } from "../config/db";

// In-memory cache to avoid querying the DB for every single chat message
// TTL: 60 seconds
const _promptCache = new Map<string, { content: string; expiresAt: number }>();

export class PromptService {
  /**
   * Fetch an active prompt by name.
   * If not found in DB (e.g. first run or deleted), returns the provided fallback.
   * Uses an in-memory cache with 60s TTL to ensure high performance.
   */
  static async getActivePrompt(name: string, fallbackContent: string): Promise<string> {
    const now = Date.now();
    const cached = _promptCache.get(name);
    
    // Return cached if valid
    if (cached && cached.expiresAt > now) {
      return cached.content;
    }

    try {
      // Find the active prompt version
      const prompt = await prisma.promptVersion.findFirst({
        where: { 
          name: name,
          isActive: true 
        },
        orderBy: { version: 'desc' }
      });

      const content = prompt ? prompt.content : fallbackContent;

      // Update cache
      _promptCache.set(name, {
        content,
        expiresAt: now + 60 * 1000 // 60 seconds TTL
      });

      return content;
    } catch (err) {
      console.error(`[PromptService] Error fetching prompt ${name}:`, err);
      return fallbackContent;
    }
  }

  /**
   * Seed a new prompt version into the database if no active version exists.
   * Useful for initial setup or migration.
   */
  static async seedPromptIfMissing(name: string, content: string): Promise<void> {
    const existing = await prisma.promptVersion.findFirst({
      where: { name }
    });

    if (!existing) {
      await prisma.promptVersion.create({
        data: {
          name,
          version: 1,
          content,
          isActive: true
        }
      });
      console.log(`[PromptService] Seeded initial prompt version for ${name}`);
    }
  }

  /**
   * Fetch an experimental prompt for A/B testing.
   * Deterministically assigns a variant based on userId.
   */
  static async getExperimentalPrompt(
    name: string,
    userId: string,
    fallbackContent: string
  ): Promise<{ content: string; variant: string }> {
    try {
      // In real implementation, this would query PromptExperiment table.
      // For now, we mock an active experiment.
      const experimentActive = true; 
      
      if (!experimentActive) {
        return { content: await this.getActivePrompt(name, fallbackContent), variant: "CONTROL" };
      }

      // Hash userId to A or B
      const charCode = userId.charCodeAt(userId.length - 1) || 0;
      const isVariantB = charCode % 2 !== 0;

      if (isVariantB) {
        return { content: fallbackContent + "\n\n(Variant B)", variant: "B" };
      }
      return { content: await this.getActivePrompt(name, fallbackContent), variant: "A" };
    } catch (err) {
      return { content: await this.getActivePrompt(name, fallbackContent), variant: "CONTROL" };
    }
  }
}

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

/**
 * Middleware untuk API Versioning berbasis Header.
 * Client harus mengirim header `Accept-Version: v1`.
 */
export const apiVersionMiddleware = (version: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientVersion = req.header("Accept-Version") || "v1";

    if (clientVersion !== version) {
      res.status(426).json({
        error: `Upgrade Required. API versi ini membutuhkan Accept-Version: ${version}. Anda mengirimkan: ${clientVersion}`
      });
      return;
    }

    next();
  };
};

/**
 * Rate Limiter per User (diambil dari JWT payload `req.user`), bukan per IP.
 * Melindungi dari penyalahgunaan API atau flooding request oleh pengguna tertentu.
 */
export const userRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 30, // Maksimal 30 request per menit per user
  keyGenerator: (req: any) => {
    // Gunakan userId jika tersedia (dari JWT), jika tidak gunakan IP sebagai fallback
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    return req.user?.userId || String(ip).replace(/:/g, "_");
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi."
    });
  }
});

/**
 * Middleware Idempotency untuk POST endpoints.
 * Mencegah eksekusi ganda jika client mengirim request yang sama persis (retry).
 */
const idempotencyCache = new Map<string, any>();

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.header("X-Idempotency-Key");
  if (!idempotencyKey) {
    // Opsional: Tolak request jika tidak ada key
    // return res.status(400).json({ error: "X-Idempotency-Key header is required for POST requests." });
    return next();
  }

  if (idempotencyCache.has(idempotencyKey)) {
    console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
    const cachedResponse = idempotencyCache.get(idempotencyKey);
    res.status(200).json(cachedResponse);
    return;
  }

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(idempotencyKey, body);
      
      // Hapus cache setelah 5 menit
      setTimeout(() => idempotencyCache.delete(idempotencyKey), 5 * 60 * 1000);
    }
    return originalJson(body);
  };

  next();
};

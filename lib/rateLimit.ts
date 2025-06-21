import { Context, Next } from "hono";
import { connectRedis, redis } from "../config/redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (c: Context) => string;
}

export const rateLimit = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    connectRedis();

    try {
      const key = config.keyGenerator(c);
      const currentTime = Date.now();
      const windowStart = currentTime - config.windowMs;

      await redis.zRemRangeByScore(key, 0, windowStart);

      const totalHitsResult = await redis.zCount(key, windowStart, currentTime);
      const totalHits = Number(totalHitsResult) || 0;

      if (totalHits >= config.maxRequests) {
        return c.json(
          {
            message: "Rate limit exceeded",
            isAllowed: false,
            totalHits,
            limit: config.maxRequests,
          },
          429
        );
      }

      await redis.zAdd(key, {
        score: currentTime,
        value: currentTime.toString(),
      });

      await redis.expire(key, Math.ceil(config.windowMs / 1000));

      await next();
    } catch (error: any) {
      console.error("Rate limiting error:", error);
      return c.json(
        {
          message: error.message,
          isAllowed: false,
          totalHits: 0,
          limit: config.maxRequests,
        },
        500
      );
    }
  };
};

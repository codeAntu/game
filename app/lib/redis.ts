import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
});

export async function connectRedis() {
  if (redis.isOpen) {
    console.log("Redis ✅");
    return;
  }
  redis.on("error", function (err) {
    throw err;
  });
  await redis.connect();
  console.log("Redis connection established successfully");
}

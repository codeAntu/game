import { rateLimit } from "@/lib/rateLimit";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import game from "./games";
import auth from "./user/auth";
import user from "./user";
import admin from "./admin";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.use("*", cors({ origin: "*" }));

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (c) => {
    const clientIP = c.req.header("x-forwarded-for") || "unknown";
    return `rate_limit:${clientIP}`;
  },
});

app.use("*", apiRateLimit);

app.route("/", game);
app.route("/", user);
app.route("/", admin);

app.get("/hello", async (c) => {
  return c.json({
    message: "Hello from Hono! This is a test.",
  });
});

app.post("/hello", (c) => {
  return c.json({
    message: "Echo from Hono!",
  });
});

export const GET = handle(app);
export const POST = handle(app);

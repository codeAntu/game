import { rateLimit } from "@/lib/rateLimit";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import admin from "./admin";
import game from "./games";
import user from "./user";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);

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

// // Explicitly handle preflight OPTIONS requests
// app.options("*", (c) => {
//   return new Response("", { status: 204 });
// });

export const GET = handle(app);
export const POST = handle(app);
// export const PUT = handle(app);
// export const DELETE = handle(app);
// export const PATCH = handle(app);
export const OPTIONS = handle(app);

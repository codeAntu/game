import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";

export const runtime = "edge";

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: "*",
  })
);

app.get("/hello", (c) => {
  return c.json({
    message: "Hello from Hono!",
  });
});

app.post("/api/echo", (c) => {
  return c.json({
    message: "Echo from Hono!",
  });
});

export const GET = handle(app);
export const POST = handle(app);

export default app;

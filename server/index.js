import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent } from "./agent.js";
import { toolCatalog } from "./tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT) || 8787;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    provider: "mock",
    model: "scout-mock-1",
    tools: toolCatalog.map(({ name, label, description }) => ({
      name,
      label,
      description,
    })),
    now: new Date().toISOString(),
  });
});

app.post("/api/chat", async (request, response) => {
  const rawMessages = request.body?.messages;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    response.status(400).json({ error: "A non-empty messages array is required." });
    return;
  }

  const messages = rawMessages
    .filter(
      (message) =>
        message && (message.role === "user" || message.role === "assistant"),
    )
    .map((message) => ({
      role: message.role,
      content:
        typeof message.content === "string"
          ? message.content.slice(0, 8000)
          : "",
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-24);

  if (
    messages.length === 0 ||
    messages[messages.length - 1].role !== "user"
  ) {
    response
      .status(400)
      .json({ error: "The last message must be a user message." });
    return;
  }

  response.status(200);
  response.set({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders?.();

  let closed = false;
  response.on("close", () => {
    closed = true;
  });

  const send = (event) => {
    if (closed || response.writableEnded) return;
    response.write(`${JSON.stringify(event)}\n`);
  };

  try {
    await runAgent({
      messages,
      send,
      isClosed: () => closed || response.writableEnded,
    });
  } catch (error) {
    console.error("[agent]", error);
    send({
      type: "error",
      message: "The agent hit an unexpected error. Check the server logs.",
    });
  } finally {
    if (!closed && !response.writableEnded) {
      send({ type: "done" });
      response.end();
    }
  }
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  console.error("[api]", error);
  response.status(500).json({ error: "Unexpected server error." });
});

app.listen(port, () => {
  console.log(`Scout API listening on http://localhost:${port}`);
});

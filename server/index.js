import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeMessages, streamAgent } from "./chat.js";
import { healthPayload } from "./health.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT) || 8787;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json(healthPayload());
});

app.post("/api/chat", async (request, response) => {
  const { messages, error } = normalizeMessages(request.body?.messages);

  if (error) {
    response.status(400).json({ error });
    return;
  }

  await streamAgent({ messages, res: response });
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

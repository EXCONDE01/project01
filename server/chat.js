import { runAgent } from "./agent.js";

export const MAX_MESSAGES = 24;
export const MAX_MESSAGE_LENGTH = 8000;

/**
 * Validates and trims an incoming messages array.
 * Returns either `{ messages }` or `{ error }`.
 */
export function normalizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { error: "A non-empty messages array is required." };
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
          ? message.content.slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_MESSAGES);

  if (
    messages.length === 0 ||
    messages[messages.length - 1].role !== "user"
  ) {
    return { error: "The last message must be a user message." };
  }

  return { messages };
}

/**
 * Streams the agent run as NDJSON. Works with both Express responses and the
 * plain Node `http.ServerResponse` objects used by Vercel functions.
 */
export async function streamAgent({ messages, res }) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let closed = false;
  res.on("close", () => {
    closed = true;
  });

  const isClosed = () => closed || res.writableEnded;

  const send = (event) => {
    if (isClosed()) return;
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    await runAgent({ messages, send, isClosed });
  } catch (error) {
    console.error("[agent]", error);
    send({
      type: "error",
      message: "The agent hit an unexpected error. Check the server logs.",
    });
  } finally {
    if (!isClosed()) {
      send({ type: "done" });
      res.end();
    }
  }
}

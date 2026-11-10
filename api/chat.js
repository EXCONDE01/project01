import { normalizeMessages, streamAgent } from "../server/chat.js";

async function readBody(request) {
  if (request.body !== undefined) return request.body;

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return undefined;

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }

  const body = await readBody(request);
  const { messages, error } = normalizeMessages(body?.messages);

  if (error) {
    response.statusCode = 400;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error }));
    return;
  }

  await streamAgent({ messages, res: response });
}

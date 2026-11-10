import { toolCatalog } from "./tools.js";

export function healthPayload() {
  return {
    status: "ok",
    provider: "mock",
    model: "scout-mock-1",
    tools: toolCatalog.map(({ name, label, description }) => ({
      name,
      label,
      description,
    })),
    now: new Date().toISOString(),
  };
}

export const TOOL_META = {
  calculator: { label: "Calculator", icon: "calculator" },
  current_time: { label: "Clock", icon: "clock" },
  knowledge_search: { label: "Knowledge base", icon: "book" },
};

export const FALLBACK_TOOLS = [
  {
    name: "calculator",
    label: "Calculator",
    description:
      "Evaluates arithmetic on the server, including percentages such as “18% of 240”.",
  },
  {
    name: "current_time",
    label: "Clock",
    description:
      "Returns the current date and time, optionally for a supported city or IANA time zone.",
  },
  {
    name: "knowledge_search",
    label: "Knowledge base",
    description:
      "Searches a small local set of demo notes about the agent, pricing, weather, launches, and support.",
  },
];

export function toolMeta(name) {
  return TOOL_META[name] ?? { label: name, icon: "wrench" };
}

export function describeArgs(name, args = {}) {
  if (name === "calculator") return args.expression ?? "";
  if (name === "current_time") return args.timeZone ?? "local time";
  if (name === "knowledge_search") {
    const query = String(args.query ?? "");
    return query.length > 48 ? `“${query.slice(0, 48)}…”` : `“${query}”`;
  }
  return "";
}

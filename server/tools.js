const STOP_WORDS = new Set([
  "what",
  "what's",
  "is",
  "are",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "with",
  "do",
  "does",
  "i",
  "me",
  "my",
  "it",
  "this",
  "that",
  "can",
  "you",
  "please",
  "look",
  "up",
  "tell",
  "about",
  "s",
]);

const ARTICLES = [
  {
    title: "How the mock agent works",
    keywords: [
      "agent",
      "mock",
      "tool",
      "tools",
      "loop",
      "work",
      "works",
      "planner",
      "stream",
      "streaming",
      "architecture",
      "how",
    ],
    body:
      "Scout is a working agent loop wrapped around a mock model. On each turn it plans a small set of steps, calls zero or more tools on the server, then streams a final answer built from the tool results.\n\nThe model itself is simulated, but the streaming protocol, tool execution, input validation, and cancellation path are real. Swap the planner in server/agent.js for a provider call and the rest of the app stays the same.",
  },
  {
    title: "Launch checklist",
    keywords: [
      "launch",
      "checklist",
      "ship",
      "release",
      "deploy",
      "production",
      "rollback",
    ],
    body:
      "- Confirm the build passes and the bundle is small enough.\n- Review the rollback plan and who can trigger it.\n- Notify support with a one-paragraph change summary.\n- Tag the release and publish the notes.\n- Watch errors and latency for the first 30 minutes.\n\nThis checklist is sample data inside the mock knowledge base.",
  },
  {
    title: "Pricing snapshot",
    keywords: [
      "pricing",
      "price",
      "plan",
      "cost",
      "billing",
      "subscription",
      "tier",
    ],
    body:
      "Starter: $0, 100 mock runs per month.\nStudio: $19 per month, unlimited local runs, shared workspaces.\nTeam: $49 per month, audit logs and role-based access.\n\nThese numbers are placeholders for the demo, not a real offer.",
  },
  {
    title: "Demo weather feed",
    keywords: [
      "weather",
      "temperature",
      "forecast",
      "rain",
      "cloudy",
      "sunny",
      "climate",
    ],
    body:
      "The demo feed says: partly cloudy, 21°C, light breeze from the west, 10% chance of rain.\n\nThis is fixed sample data, not a live forecast. A real weather tool would call an upstream API here.",
  },
  {
    title: "Support runbook",
    keywords: [
      "support",
      "refund",
      "escalate",
      "escalation",
      "runbook",
      "customer",
      "ticket",
      "policy",
    ],
    body:
      "1. Collect the order or ticket ID.\n2. Check the last three account events for a clear failure.\n3. If the cause is unclear, reply with a short acknowledgement and escalate.\n4. Tag the ticket with the affected surface and the suspected owner.\n\nThis runbook is sample data inside the mock knowledge base.",
  },
];

export const toolCatalog = [
  {
    name: "calculator",
    label: "Calculator",
    description:
      "Evaluates arithmetic on the server, including percentages such as “18% of 240”.",
    parameters: { expression: "string" },
  },
  {
    name: "current_time",
    label: "Clock",
    description:
      "Returns the current date and time, optionally for a supported city or IANA time zone.",
    parameters: { timeZone: "string (optional)" },
  },
  {
    name: "knowledge_search",
    label: "Knowledge base",
    description:
      "Searches a small local set of demo notes about the agent, pricing, weather, launches, and support.",
    parameters: { query: "string" },
  },
];

function round(value) {
  if (!Number.isFinite(value)) {
    throw new Error("The result is not a finite number.");
  }
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeExpression(raw) {
  return String(raw ?? "")
    .replace(/,/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .trim();
}

function evaluate(source) {
  let index = 0;

  function skipSpaces() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }

  function peek() {
    skipSpaces();
    return source[index];
  }

  function parseExpression() {
    let value = parseTerm();
    for (;;) {
      const operator = peek();
      if (operator !== "+" && operator !== "-") break;
      index += 1;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    for (;;) {
      const operator = peek();
      if (operator !== "*" && operator !== "/" && operator !== "%") break;
      index += 1;
      const right = parseUnary();
      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error("Division by zero is not allowed.");
      }
      if (operator === "*") value *= right;
      else if (operator === "/") value /= right;
      else value %= right;
    }
    return value;
  }

  function parseUnary() {
    const operator = peek();
    if (operator === "+") {
      index += 1;
      return parseUnary();
    }
    if (operator === "-") {
      index += 1;
      return -parseUnary();
    }
    return parsePower();
  }

  function parsePower() {
    let value = parsePrimary();
    if (peek() === "^") {
      index += 1;
      value = Math.pow(value, parseUnary());
    }
    return value;
  }

  function parsePrimary() {
    skipSpaces();
    if (source[index] === "(") {
      index += 1;
      const value = parseExpression();
      skipSpaces();
      if (source[index] !== ")") {
        throw new Error("Mismatched parentheses.");
      }
      index += 1;
      return value;
    }

    const match = /^\d+(?:\.\d+)?|^\.\d+/.exec(source.slice(index));
    if (!match) {
      throw new Error(
        `Unexpected token "${source[index] ?? "end of expression"}".`,
      );
    }
    index += match[0].length;
    return Number(match[0]);
  }

  const result = parseExpression();
  skipSpaces();
  if (index < source.length) {
    throw new Error(`Unexpected token "${source[index]}".`);
  }
  return result;
}

function calculate(rawExpression) {
  const expression = normalizeExpression(rawExpression);
  if (!expression) {
    throw new Error("An expression is required.");
  }

  const percent = expression.match(
    /^(-?\d+(?:\.\d+)?)\s*%\s*(of|off)\s*(-?\d+(?:\.\d+)?)$/i,
  );
  if (percent) {
    const percentage = Number(percent[1]);
    const amount = Number(percent[3]);
    const portion = (percentage / 100) * amount;
    const cut = percent[2].toLowerCase() === "off";
    return {
      expression,
      result: round(cut ? amount - portion : portion),
      mode: cut ? "percent-off" : "percent-of",
    };
  }

  if (!/^[\d\s+\-*/^%().]+$/.test(expression)) {
    throw new Error(
      "Only numbers and the operators + - * / ^ % ( ) are supported.",
    );
  }

  return {
    expression,
    result: round(evaluate(expression)),
    mode: "arithmetic",
  };
}

function currentTime(requestedZone) {
  const now = new Date();
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const requested =
    typeof requestedZone === "string" ? requestedZone.trim() : "";
  let timeZone = requested || fallback;
  let fallbackUsed = false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(now);
  } catch {
    timeZone = fallback;
    fallbackUsed = Boolean(requested);
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const zonePart = timeZone.split("/").pop() || timeZone;

  return {
    timeZone,
    time,
    date,
    label: zonePart.replace(/_/g, " "),
    iso: now.toISOString(),
    requestedZone: requested || null,
    fallbackUsed,
  };
}

function searchKnowledge(rawQuery) {
  const query = String(rawQuery ?? "").trim();
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const scored = ARTICLES.map((article) => {
    const title = article.title.toLowerCase();
    const keywords = article.keywords.join(" ");
    const body = article.body.toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (title.includes(token)) score += 4;
      if (keywords.includes(token)) score += 3;
      if (body.includes(token)) score += 1;
    }

    return { article, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  return {
    query,
    matches: scored.map(({ article, score }) => ({
      title: article.title,
      body: article.body,
      snippet:
        article.body.length > 180
          ? `${article.body.slice(0, 180).trimEnd()}…`
          : article.body,
      score,
    })),
  };
}

export async function executeTool(name, args = {}) {
  switch (name) {
    case "calculator":
      return calculate(args.expression);
    case "current_time":
      return currentTime(args.timeZone);
    case "knowledge_search":
      return searchKnowledge(args.query);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

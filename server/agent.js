import { randomUUID } from "node:crypto";
import { executeTool } from "./tools.js";

const CITIES = [
  { match: "new york", timeZone: "America/New_York" },
  { match: "los angeles", timeZone: "America/Los_Angeles" },
  { match: "san francisco", timeZone: "America/Los_Angeles" },
  { match: "hong kong", timeZone: "Asia/Hong_Kong" },
  { match: "singapore", timeZone: "Asia/Singapore" },
  { match: "chicago", timeZone: "America/Chicago" },
  { match: "toronto", timeZone: "America/Toronto" },
  { match: "sydney", timeZone: "Australia/Sydney" },
  { match: "london", timeZone: "Europe/London" },
  { match: "berlin", timeZone: "Europe/Berlin" },
  { match: "paris", timeZone: "Europe/Paris" },
  { match: "tokyo", timeZone: "Asia/Tokyo" },
  { match: "dubai", timeZone: "Asia/Dubai" },
  { match: "manila", timeZone: "Asia/Manila" },
];

const PERCENT_PATTERN =
  /-?\d+(?:\.\d+)?\s*%\s*(?:of|off)\s*-?\d+(?:\.\d+)?/i;
const ARITHMETIC_PATTERN =
  /-?\d+(?:\.\d+)?(?:\s*(?:[+\-*/^%]|[x×÷])\s*-?\d+(?:\.\d+)?)+/i;
const TIME_PATTERN = /\b(time|clock|date|day|today|tonight)\b/i;
const KNOWLEDGE_PATTERN =
  /\b(agent|mock|tool|tools|knowledge|docs?|documentation|pricing|price|cost|billing|weather|forecast|launch|checklist|release|support|refund|runbook|policy|api|capabilit(?:y|ies))\b/i;

function tokenize(text) {
  return text.match(/\S+\s*/g) ?? [text];
}

function hash(text) {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) >>> 0;
  }
  return value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 10,
  }).format(value);
}

function findExpression(text) {
  const percent = text.match(PERCENT_PATTERN);
  if (percent) return percent[0];

  const cleaned = text.replace(/,/g, "");
  const arithmetic = cleaned.match(ARITHMETIC_PATTERN);
  return arithmetic ? arithmetic[0] : null;
}

function detectCity(text) {
  const lower = text.toLowerCase();
  return CITIES.find((city) => lower.includes(city.match)) ?? null;
}

function buildPlan(text) {
  const plan = [];
  const expression = findExpression(text);

  if (expression) {
    plan.push({ name: "calculator", args: { expression } });
  }

  if (TIME_PATTERN.test(text)) {
    const city = detectCity(text);
    plan.push({
      name: "current_time",
      args: city ? { timeZone: city.timeZone } : {},
    });
  }

  if (KNOWLEDGE_PATTERN.test(text)) {
    plan.push({ name: "knowledge_search", args: { query: text } });
  }

  return plan.slice(0, 3);
}

function mockReply(text) {
  const lower = text.toLowerCase().trim();

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(lower)) {
    return "Hey — I'm Scout, a mock agent with three tools: a calculator, a clock, and a small knowledge base.\n\nTry **What is 18% of 240?**, **What time is it in Tokyo?**, or **How does this agent work?**";
  }

  if (/\b(thanks|thank you)\b/.test(lower)) {
    return "Anytime. I'm still running in mock mode, but the tool loop is real — calculations, time checks, and knowledge lookups all execute on the server.";
  }

  if (/\b(what can you do|capabilities|abilities)\b/.test(lower)) {
    return "I can run three tools: a **calculator** for arithmetic and percentages, a **clock** for the current time in a city, and a **knowledge search** over a small local demo wiki.\n\nI can also stream answers and show every tool call as it happens. General conversation is simulated until you connect a real model.";
  }

  const variants = [
    "I don't have a live language model connected in this build, so general conversation is simulated. The agent loop is real, though: I plan, call tools, and stream results.\n\nTry a calculation, a time-zone check, or a knowledge-base lookup.",
    "That's outside the mock planner's depth right now. I can still show the full agent flow — ask me for math, the current time in a city, or a note from the knowledge base.",
    "Good question — but this build runs on a mock model, so I can't answer it properly yet. The same interface is ready for a real provider when you connect one.",
  ];

  return variants[hash(text) % variants.length];
}

function buildAnswer(text, results) {
  if (results.length === 0) {
    return mockReply(text);
  }

  const blocks = [];

  for (const entry of results) {
    if (entry.name === "calculator") {
      if (entry.ok) {
        blocks.push(
          `**${entry.result.expression} = ${formatNumber(entry.result.result)}**\n\nThe calculator ran locally, so this result is exact.`,
        );
      } else {
        blocks.push(
          `I tried the calculator, but it failed: ${entry.result.error}`,
        );
      }
    }

    if (entry.name === "current_time") {
      if (entry.ok) {
        const time = entry.result;
        const note = time.fallbackUsed
          ? ` I couldn't resolve that time zone, so I used ${time.timeZone}.`
          : "";
        blocks.push(
          `It's **${time.time}** on **${time.date}** in ${time.label} (${time.timeZone}).${note}`,
        );
      } else {
        blocks.push(`The clock tool failed: ${entry.result.error}`);
      }
    }

    if (entry.name === "knowledge_search") {
      if (entry.ok) {
        const matches = entry.result.matches;
        if (matches.length > 0) {
          const top = matches[0];
          blocks.push(
            `Here's the closest match from the knowledge base:\n\n**${top.title}**\n${top.body}\n\nThis note comes from the local mock knowledge base.`,
          );
        } else {
          blocks.push(
            `I searched the knowledge base for **${entry.result.query}**, but didn't find a match.\n\nTry asking about the mock agent, pricing, the launch checklist, demo weather, or the support runbook.`,
          );
        }
      } else {
        blocks.push(`The knowledge search failed: ${entry.result.error}`);
      }
    }
  }

  return blocks.join("\n\n") || mockReply(text);
}

function sleep(ms, isClosed) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const step = () => {
      if (isClosed() || Date.now() - startedAt >= ms) {
        resolve();
        return;
      }
      setTimeout(step, 20);
    };
    setTimeout(step, Math.min(20, ms));
  });
}

export async function runAgent({ messages, send, isClosed }) {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "";

  send({ type: "status", status: "thinking" });
  await sleep(420 + Math.random() * 260, isClosed);
  if (isClosed()) return;

  const plan = buildPlan(latestUserMessage);
  const results = [];

  for (const step of plan) {
    if (isClosed()) return;

    const id = `call_${randomUUID().slice(0, 8)}`;
    send({
      type: "tool_call",
      call: { id, name: step.name, args: step.args },
    });

    const startedAt = Date.now();
    let ok = true;
    let result;

    try {
      result = await executeTool(step.name, step.args);
    } catch (error) {
      ok = false;
      result = { error: error.message || "The tool failed." };
    }

    const durationMs = Math.max(1, Date.now() - startedAt);
    await sleep(ok ? 280 : 160, isClosed);
    if (isClosed()) return;

    send({
      type: "tool_result",
      id,
      name: step.name,
      ok,
      result,
      durationMs,
    });
    results.push({ name: step.name, args: step.args, ok, result });

    await sleep(180, isClosed);
  }

  if (isClosed()) return;

  const answer = buildAnswer(latestUserMessage, results);
  send({ type: "status", status: "writing" });
  await sleep(220, isClosed);
  if (isClosed()) return;

  for (const token of tokenize(answer)) {
    if (isClosed()) return;
    send({ type: "delta", text: token });
    await sleep(14 + Math.random() * 20, isClosed);
  }
}

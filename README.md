# Scout — AI Agent Demo

A small, full-stack AI agent app. The model is mocked, but the agent loop is
real: Scout plans tool calls, executes them on a Node server, streams every
step over NDJSON, and renders the trace in a React chat UI.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

- Vite serves the React frontend on port `5173`.
- Express serves the agent API on port `8787`.
- Vite proxies `/api` to the Express server, so no CORS setup is needed.

No API key is required in mock mode.

## Try these prompts

- `What is 18% of 240?` — calculator tool
- `What time is it in Tokyo?` — clock tool with a city lookup
- `How does this agent work?` — knowledge-base tool
- `Look up the launch checklist` — knowledge-base tool
- `20% off 80` — percentage calculator

## What is real vs. mocked

| Piece | Status |
| --- | --- |
| Chat UI, streaming renderer, cancellation | Real |
| Agent tool loop and event protocol | Real |
| Calculator, clock, knowledge search | Real, local |
| Language model / intent planning | Mocked heuristics |
| Conversation persistence | Real, in `localStorage` |

## Architecture

```
React (Vite, :5173)
  |  POST /api/chat  { messages }
  v
Express (:8787)
  |  mock planner picks tools
  v
Tools  ->  calculator | current_time | knowledge_search
  |
  |  NDJSON events (status, tool_call, tool_result, delta, error, done)
  v
React renders tokens + tool trace, saves conversation locally
```

### Stream protocol

Each line of the response is a JSON event:

```json
{"type":"status","status":"thinking"}
{"type":"tool_call","call":{"id":"call_ab12","name":"calculator","args":{"expression":"18% of 240"}}}
{"type":"tool_result","id":"call_ab12","name":"calculator","ok":true,"result":{"expression":"18% of 240","result":43.2},"durationMs":2}
{"type":"status","status":"writing"}
{"type":"delta","text":"**18% of 240 = 43.2**\n\n"}
{"type":"done"}
```

`POST /api/chat` accepts up to 24 recent messages, caps each at 8,000
characters, and requires the final message to be from the user.

## Project layout

```
index.html              Vite entry
server/
  index.js              Express API + production static serving
  agent.js              Mock planner, agent loop, streaming
  tools.js              Tool implementations and demo knowledge base
src/
  App.jsx               App shell, health check, shortcuts
  hooks/useChat.js      Conversations, streaming state, persistence
  lib/api.js            NDJSON stream reader
  components/           Sidebar, Topbar, ChatView, Message, ToolCall, Composer…
  styles.css            Dark responsive UI
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the API and Vite together |
| `npm run dev:api` | Run only the Express API with watch mode |
| `npm run dev:web` | Run only the Vite frontend |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Serve the API and built frontend on `:8787` |

For a production preview:

```bash
npm run build
npm start
# open http://localhost:8787
```

## Connecting a real model

The interface and protocol are provider-agnostic. To make Scout a real agent:

1. Add a provider SDK or use `fetch` in `server/agent.js`.
2. Replace `buildPlan()` and `buildAnswer()` with a model loop that emits the
   same events shown above.
3. Pass the tool schemas from `server/tools.js` to the model.
4. Keep the API key on the server (for example, read it from `process.env`).
5. Keep `send({ type: "delta", text })` for streaming and
   `send({ type: "tool_call" / "tool_result" })` for traces.

The client needs no changes as long as the event shape stays the same.

## Notes

- Conversations are stored in the browser only. There is no database.
- "Delete" removes a conversation from local storage.
- The demo knowledge base is sample data, including pricing and weather.
- `Ctrl/Cmd + K` starts a new conversation, `Esc` closes overlays.

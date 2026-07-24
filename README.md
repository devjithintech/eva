# LightHouse · Candidate Intelligence Agent

An **[AG-UI](https://docs.ag-ui.com) generative-UI** application. A user asks about a
fund candidate in natural language; an agent streams a spoken answer **and** assembles
the exact data view (scorecard, comparison, correlation matrix, …) on a live canvas.

Ported from a static HTML prototype into a properly structured React + TypeScript app
backed by a real agent server. Models are swappable — **Gemini is the default** — and
the app runs end-to-end with **no API keys** via a deterministic mock provider.

```
┌─────────────────────┐   AG-UI events (SSE)   ┌──────────────────────────────┐
│  web/  (Vite/React)  │ ◀───────────────────── │  server/  (Express + AG-UI)   │
│  HttpAgent.subscribe │   TEXT_MESSAGE_* +     │  provider → tools → executors │
│  → chat + canvas     │   TOOL_CALL_* (args)   │  Gemini · OpenAI · Anthropic  │
└─────────────────────┘ ──────────────────────▶ │  · mock (keyless)             │
        POST /agent  { RunAgentInput }          └──────────────────────────────┘
```

## How it works

- The frontend talks to the agent through the **AG-UI protocol** (`@ag-ui/client`
  `HttpAgent`). One run streams protocol events; the hook in
  [`web/src/agui/useAguiAgent.ts`](web/src/agui/useAguiAgent.ts) turns them into React state.
- The agent's spoken answer arrives as `TEXT_MESSAGE_*` events → the chat panel.
- Each **artifact** is a `render_*` **tool call**. The server *owns the data*: the model
  only picks which view + entities, and a tool executor enriches the call with trusted
  numbers before emitting `TOOL_CALL_ARGS`. The canvas renders the matching React
  component from that payload — this is the generative UI.
- **Model switching:** the picker calls `GET /models` (only providers with keys are
  listed, plus the demo). The chosen id is sent via `forwardedProps.model`; the server's
  [`registry`](server/src/llm/registry.ts) resolves it to a provider.

## Quick start

```bash
npm install

# optional — add keys to enable real models (Gemini default). Without this,
# the app runs the keyless "demo" provider end-to-end.
cp server/.env.example server/.env   # then fill in GEMINI_API_KEY etc.

npm run dev        # server on :8787, web on :5173 (proxied)
```

Open http://localhost:5173. Try: *"Score ANDA Cruise for the interview committee"*,
*"How does ANDA Cruise compare to Julia Main?"*, *"…how does it stack up against our
standard benchmarks?"* — or tap the mic for a guided walkthrough.

## Project layout

```
server/                      Express + AG-UI agent backend
  src/
    index.ts                 /agent (SSE), /models, /health
    config.ts                env (keys, default model)
    agui/
      stream.ts              Response → AG-UI SSE (EventEncoder)
      events.ts              typed AG-UI event factories
      runAgent.ts            run orchestrator: provider stream → AG-UI events
    llm/
      types.ts               provider-agnostic LLM contract
      registry.ts            model catalog + resolution (Gemini-first)
      gemini.ts openai.ts anthropic.ts mock.ts
    agent/
      systemPrompt.ts tools.ts toolExecutors.ts
    data/
      types.ts candidates.ts canonical dataset + artifact builders

web/                         Vite + React + TS frontend
  src/
    App.tsx
    agui/                    artifacts.ts (payload contract), useAguiAgent, useModels
    context/ThemeContext.tsx styles/ (global.css, theme.ts)
    components/
      layout/                TopBar, Collaboration
      chat/                  ColdStart, ChatPanel, Composer, ModelSwitcher, Waveform
      canvas/                CanvasPanel, ArtifactRenderer, Skeleton, artifacts/*
```

## Adding a model

Add an entry to `MODEL_CATALOG` in [`server/src/llm/registry.ts`](server/src/llm/registry.ts)
pointing at an existing provider (or implement a new `LLMProvider` in `server/src/llm/`).
It appears in the picker automatically once its provider is configured.

## Adding an artifact

1. Add the payload shape to `server/src/data/types.ts` **and** mirror it in
   `web/src/agui/artifacts.ts`.
2. Add a builder + tool (`server/src/agent/tools.ts`, `toolExecutors.ts`).
3. Add the React component and a `case` in `web/src/components/canvas/ArtifactRenderer.tsx`.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | server + web in parallel |
| `npm run build` | typecheck + build both |
| `npm run typecheck` | typecheck both |

## Notes

- **Keys never reach the browser** — the frontend only talks to `/agent`.
- The artifact payload contract is duplicated on both sides (server `data/types.ts` ↔
  web `agui/artifacts.ts`); keep them in sync. (A shared workspace package is the natural
  next step if the contract grows.)

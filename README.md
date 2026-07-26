# LightHouse · Candidate Intelligence Agent

An **[AG-UI](https://docs.ag-ui.com) generative-UI** application. A user asks about a
fund candidate in natural language; an agent streams a spoken answer **and** assembles
the exact data view (scorecard, comparison, correlation matrix, …) on a live canvas.

Ported from a static HTML prototype into a properly structured React + TypeScript app
backed by a real agent server. Models are swappable — **Gemini is the default** — and
the app runs end-to-end with **no API keys** via a deterministic mock provider.

```
┌─────────────────────┐   AG-UI events (SSE)   ┌──────────────────────────────┐
│  conversation-ui/    │ ◀───────────────────── │  server/  (Express + AG-UI)   │
│  (Vite/React)        │   TEXT_MESSAGE_* +     │  provider → tools → executors │
│  HttpAgent.subscribe │   TOOL_CALL_* (args)   │  Gemini · OpenAI · Anthropic  │
│  → chat + canvas     │                        │  · mock (keyless)             │
└─────────────────────┘ ──────────────────────▶ │                              │
        POST /agent  { RunAgentInput }          └──────────────────────────────┘

┌─────────────────────┐        REST (/api/*)     ┌──────────────────────────────┐
│  dashboard-ui/       │ ◀──────────────────────  │  server/  BFF                 │
│  (Vite/React)        │ ────────────────────────▶│  read-only over               │
└─────────────────────┘                          │  server/data/*.json           │
                                                  └──────────────────────────────┘
```

## How it works

- The **conversation-ui** talks to the agent through the **AG-UI protocol** (`@ag-ui/client`
  `HttpAgent`). One run streams protocol events; the hook in
  [`conversation-ui/src/agui/useAguiAgent.ts`](conversation-ui/src/agui/useAguiAgent.ts) turns them into React state.
- The agent's spoken answer arrives as `TEXT_MESSAGE_*` events → the chat panel.
- Each **artifact** is a `render_*` **tool call**. The server *owns the data*: the model
  only picks which view + entities, and a tool executor enriches the call with trusted
  numbers before emitting `TOOL_CALL_ARGS`. The canvas renders the matching React
  component from that payload — this is the generative UI.
- **Model switching:** the picker calls `GET /models` (only providers with keys are
  listed, plus the demo). The chosen id is sent via `forwardedProps.model`; the server's
  [`registry`](server/src/llm/registry.ts) resolves it to a provider.

## Quick start

`server/`, `conversation-ui/`, and `dashboard-ui/` are **independent npm packages** —
each has its own `package-lock.json` and `node_modules`, installed separately (this is
not an npm workspaces monorepo). The root `package.json` has no dependencies of its own
(no root `node_modules`) — it only orchestrates `dev`/`build`/`typecheck` via shell.

```bash
npm run install:all
# equivalent to:
#   npm --prefix server install
#   npm --prefix conversation-ui install
#   npm --prefix dashboard-ui install

# optional — add keys to enable real models (Gemini default). Without this,
# the app runs the keyless "demo" provider end-to-end.
cp server/.env.example server/.env   # then fill in GEMINI_API_KEY etc.

npm run dev        # server on :8787, conversation-ui on :5173, dashboard-ui on :5174 (all proxied)
```

Each app can also be run on its own, alongside the others as needed:

```bash
npm run dev:server          # Express + AG-UI agent backend on :8787
npm run dev:conversation-ui # chat + generative canvas on :5173
npm run dev:dashboard-ui    # candidate-intelligence dashboard on :5174
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

conversation-ui/             Vite + React + TS frontend — chat + generative canvas
  src/
    App.tsx
    agui/                    artifacts.ts (payload contract), useAguiAgent, useModels
    context/ThemeContext.tsx styles/ (global.css, theme.ts)
    components/
      layout/                TopBar, Collaboration
      chat/                  ColdStart, ChatPanel, Composer, ModelSwitcher, Waveform
      canvas/                CanvasPanel, ArtifactRenderer, Skeleton, artifacts/*

dashboard-ui/                Vite + React + TS frontend — candidate-intelligence dashboard
  src/
    App.tsx                  hash router (#/, #/candidates/:id, #/candidates/:id/peer-fit)
    api/                     client.ts, hooks.ts, types.ts (mirrors server/src/bff/types.ts), sections.ts
    lib/score.ts              client-side composite "Score" preview (table only)
    components/
      layout/                TopBar, Breadcrumbs
      common/                LoadingState, ErrorState, StatCard
      dashboard/             PipelineTabs, CandidateTable, AzFilterStrip, CandidateRowDetail, CompareDrawer, InsightsPanel
      detail/                FundHero, SidebarNav, ScorecardSection, PerformanceSection, RiskSection, AnalystFlagsSection, ManagerSection, ClassificationSection, FeesTermsSection
      peerfit/               fixtures.ts (mock — see banner in the UI), SnapshotView, PeerTableView, CorrelationsView, MatrixView, SimulatorView
    pages/                   CandidatesPage, CandidateDetailPage, PeerFitPage
```

## Adding a model

Add an entry to `MODEL_CATALOG` in [`server/src/llm/registry.ts`](server/src/llm/registry.ts)
pointing at an existing provider (or implement a new `LLMProvider` in `server/src/llm/`).
It appears in the picker automatically once its provider is configured.

## Adding an artifact

1. Add the payload shape to `server/src/data/types.ts` **and** mirror it in
   `conversation-ui/src/agui/artifacts.ts`.
2. Add a builder + tool (`server/src/agent/tools.ts`, `toolExecutors.ts`).
3. Add the React component and a `case` in `conversation-ui/src/components/canvas/ArtifactRenderer.tsx`.

## Scripts

| Command | What |
| --- | --- |
| `npm run install:all` | `npm install` in each of the 3 packages (no root install needed) |
| `npm run dev` | server + conversation-ui + dashboard-ui, all in parallel |
| `npm run dev:server` | just the Express + AG-UI backend |
| `npm run dev:conversation-ui` | just the chat + canvas frontend |
| `npm run dev:dashboard-ui` | just the dashboard frontend |
| `npm run build` | typecheck + build all three |
| `npm run typecheck` | typecheck all three |

## Notes

- **Keys never reach the browser** — the frontends only talk to `/agent` and `/api/*`.
- The artifact/BFF payload contracts are duplicated across packages (server `data/types.ts` ↔
  conversation-ui `agui/artifacts.ts`; server `bff/types.ts` ↔ dashboard-ui `api/types.ts`) — keep
  them in sync by hand. Since the three packages are independent (no shared workspace package),
  a types package is the natural next step if the contracts grow enough to warrant it.
- `dashboard-ui`'s peer-fit/simulator page uses static mock fixtures — `data.json` has no pairwise
  peer correlations or what-if simulator inputs yet (see the comment on `buildPeerCorrelation` in
  `server/src/data/candidates.ts`). Everything else in `dashboard-ui` is real data from the BFF.

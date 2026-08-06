import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import type { RunAgentInput } from "@ag-ui/core";
import { config } from "./config.js";
import { availableModels, resolveModel } from "./llm/registry.js";
import { getProvider, ttsStatus } from "./tts/registry.js";
import { resolveSTT, sttStatus } from "./stt/registry.js";
import { AguiStream } from "./agui/stream.js";
import { runAgent } from "./agui/runAgent.js";
import { bff } from "./bff/routes.js";
import { openapi } from "./bff/openapi.js";
import { primeDataset } from "./data/sqlDataset.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, defaultModel: resolveModel().entry.id });
});

/** OpenAPI spec + Swagger UI for the BFF (assets bundled — works offline). */
app.get("/api/openapi.json", (_req, res) => res.json(openapi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "LightHouse BFF API" }));

/** Optional API-key gate for the BFF data endpoints (docs stay open). Unset
 *  D1_API_KEY = open, for local dev. The web UI is covered by the Vite dev
 *  proxy injecting the header (see dashboard-ui/vite.config.ts). */
app.use("/api", (req, res, next) => {
  if (!config.d1ApiKey) return next();
  const bearer = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (req.get("x-api-key") === config.d1ApiKey || bearer === config.d1ApiKey) return next();
  res.status(401).json({ error: "unauthorized", message: "Missing or invalid API key (x-api-key)" });
});

/** BFF: read-only REST for the web UI — candidate data served from SQL Server
 *  (dbo.Candidates + analytics tables; data.json is a fallback). */
app.use("/api", bff);

/** Models the client may select right now (only providers with keys + mock). */
app.get("/models", (_req, res) => {
  res.json({
    models: availableModels().map((m) => ({ id: m.id, label: m.label, sub: m.sub, provider: m.providerId })),
    default: resolveModel().entry.id,
  });
});

/** Voice status — lets the client know if server-side TTS is available. */
app.get("/tts/status", (_req, res) => {
  res.json(ttsStatus());
});

/** Text-to-speech: synthesize one chunk of the assistant's spoken answer. */
app.post("/tts", async (req, res) => {
  const { text, voice, provider: providerId } = (req.body ?? {}) as {
    text?: string;
    voice?: string;
    provider?: string;
  };
  if (!text || !text.trim()) {
    res.status(400).json({ error: "Missing text" });
    return;
  }
  const provider = getProvider(providerId);
  if (!provider) {
    res.status(503).json({ error: "no_tts", message: "No TTS provider configured" });
    return;
  }
  try {
    const { audio, contentType } = await provider.synthesize(text.trim(), voice);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch (err) {
    res.status(502).json({ error: "tts_failed", message: err instanceof Error ? err.message : "TTS failed" });
  }
});

/** Voice status — lets the client know if server-side STT is available. */
app.get("/transcribe/status", (_req, res) => {
  res.json(sttStatus());
});

/** Speech-to-text: transcribe one recorded audio clip. The client posts the
 *  raw audio bytes with the recording's Content-Type. */
app.post("/transcribe", express.raw({ type: () => true, limit: "25mb" }), async (req, res) => {
  const audio = req.body as Buffer;
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    res.status(400).json({ error: "Missing audio" });
    return;
  }
  const provider = resolveSTT();
  if (!provider) {
    res.status(503).json({ error: "no_stt", message: "No STT provider configured" });
    return;
  }
  try {
    const text = await provider.transcribe(audio, req.headers["content-type"] ?? "audio/webm");
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: "stt_failed", message: err instanceof Error ? err.message : "STT failed" });
  }
});

/** AG-UI endpoint: streams protocol events for one agent run as SSE. */
app.post("/agent", async (req, res) => {
  const input = req.body as RunAgentInput;
  if (!input?.threadId || !input?.runId || !Array.isArray(input?.messages)) {
    res.status(400).json({ error: "Invalid RunAgentInput" });
    return;
  }

  const controller = new AbortController();
  const stream = new AguiStream(res);
  stream.onClose(() => controller.abort());

  await runAgent(input, stream, controller.signal);
});

/** Load the candidate dataset (SQL Server, or data.json fallback) before
 *  accepting traffic — the BFF's builders read it synchronously. */
const dataset = await primeDataset();

app.listen(config.port, () => {
  const model = resolveModel().entry;
  console.log(`▸ LightHouse agent server on http://localhost:${config.port}`);
  console.log(`  candidate data: ${dataset.source} (${dataset.count} candidates)`);
  console.log(`  default model: ${model.label} (${model.providerId})`);
  console.log(`  available: ${availableModels().map((m) => m.id).join(", ")}`);
  const tts = ttsStatus();
  console.log(`  voice/TTS: ${tts.default ? `${tts.default.provider} (${tts.default.voice}) · ${tts.options.length} voices` : "browser fallback (no provider key)"}`);
  const stt = sttStatus();
  console.log(`  voice/STT: ${stt.enabled ? `${stt.provider} transcription` : "browser fallback (no provider key)"}`);
});

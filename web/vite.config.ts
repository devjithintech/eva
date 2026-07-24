import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy AG-UI endpoints to the agent server so the browser talks to
// the same origin (no CORS, keys stay server-side).
const AGENT_TARGET = process.env.AGENT_TARGET ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: AGENT_TARGET, changeOrigin: true },
      "/agent": { target: AGENT_TARGET, changeOrigin: true },
      "/models": { target: AGENT_TARGET, changeOrigin: true },
      "/tts": { target: AGENT_TARGET, changeOrigin: true },
      "/transcribe": { target: AGENT_TARGET, changeOrigin: true },
      "/health": { target: AGENT_TARGET, changeOrigin: true },
    },
  },
});

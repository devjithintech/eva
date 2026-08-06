import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy BFF endpoints to the agent server so the browser talks to
// the same origin (no CORS, keys stay server-side).
const AGENT_TARGET = process.env.AGENT_TARGET ?? "http://localhost:8787";

// When the BFF is protected (server D1_API_KEY set), the proxy injects the
// key server-side so it never reaches the browser. Set the same value here.
const D1_API_KEY = process.env.D1_API_KEY ?? "";
const apiHeaders = D1_API_KEY ? { "x-api-key": D1_API_KEY } : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": { target: AGENT_TARGET, changeOrigin: true, headers: apiHeaders },
      "/health": { target: AGENT_TARGET, changeOrigin: true },
    },
  },
});

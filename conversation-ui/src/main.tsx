import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted Inter (bundled — no external request, works on locked-down
// networks). All UI text is sans: "Inter", system-ui fallback.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { ThemeProvider } from "./context/ThemeContext";
import { App } from "./App";
import { TestUI } from "./test/TestUI";
import "./styles/global.css";

/** Minimal hash router: #/test → AG-UI artifact gallery, everything else → the app. */
function Root() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash.startsWith("#/test") ? <TestUI /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider initial="light">
      <Root />
    </ThemeProvider>
  </StrictMode>,
);

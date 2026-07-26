import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { THEMES, type ThemeName, type ThemeVars } from "../styles/theme";

interface ThemeCtx {
  theme: ThemeName;
  vars: ThemeVars;
  isDark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children, initial = "light" }: { children: ReactNode; initial?: ThemeName }) {
  const [theme, setTheme] = useState<ThemeName>(initial);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const value = useMemo<ThemeCtx>(
    () => ({ theme, vars: THEMES[theme], isDark: theme === "dark", toggle }),
    [theme, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

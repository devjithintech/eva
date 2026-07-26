/**
 * Theme tokens. Components use `var(--token)` and we swap a map of CSS custom
 * properties on the app root per theme. This set is a superset: it carries the
 * new LightHouse design-system vars (--primary, --soft, --card, --muted, …) used
 * by the ported 3-column shell CSS *and* the legacy names (--acc, --panel,
 * --ink2, …) still referenced by the artifact internals — all kept consistent so
 * light and dark both hold together.
 */
export type ThemeName = "light" | "dark";

export type ThemeVars = Record<string, string>;

export const LIGHT: ThemeVars = {
  // ── new design-system palette ──────────────────────────────────────────
  "--primary": "#6c5cf0",
  "--primary-d": "#5847d6",
  "--primary-soft": "#efedfd",
  "--muted": "#6b7280",
  "--faint": "#9aa1ab",
  "--slate": "#5b6675",
  "--soft": "#f4f5f7",
  "--soft2": "#fafbfc",
  "--card": "#fcfcfc",
  "--bul": "#c7c7c7",
  "--blue-soft": "#e8eefc",
  "--blue-ink": "#123a96",
  "--blue-bd": "#cdd9f7",
  "--teal": "#0e7c86",
  "--amber": "#b5651d",
  "--neg": "#c2362b",

  // ── surfaces / structure ───────────────────────────────────────────────
  "--bg": "#ffffff",
  "--panel": "#ffffff",
  "--panel2": "#fafbfc",
  "--field": "#ffffff",
  // warm "paper" surface for the generated workspace (matches the mockup)
  "--paper": "#f5f4ef",
  "--line": "#e8eaed",
  "--line2": "#f0f1f3",
  "--chip": "#f4f5f7",

  // ── text ───────────────────────────────────────────────────────────────
  "--ink": "#1a1d23",
  "--ink2": "#5b6675",
  "--ink3": "#9aa1ab",
  "--mline": "#cbcbd8",

  // ── accent (legacy aliases → primary) ──────────────────────────────────
  "--asoft": "#efedfd",
  "--aline": "#ded9fb",
  "--acc": "#6c5cf0",

  // ── semantic status ────────────────────────────────────────────────────
  "--gsoft": "#eaf7ef",
  "--gline": "#cde9d6",
  "--gtext": "#1f8a4c",
  "--rsoft": "#fcebe9",
  "--rline": "#f3d2cd",
  "--rtext": "#c2362b",
  "--asoft2": "#fbf0de",
  "--aline2": "#f3e7cf",
  "--atext": "#b5651d",

  // ── skeletons ──────────────────────────────────────────────────────────
  "--skel1": "#f1f2f5",
  "--skel2": "#e6e8ec",
};

export const DARK: ThemeVars = {
  // ── new design-system palette ──────────────────────────────────────────
  "--primary": "#b3a8ff",
  "--primary-d": "#c8bfff",
  "--primary-soft": "#241f3d",
  "--muted": "#a9b0bb",
  "--faint": "#767d89",
  "--slate": "#a9b0bb",
  "--soft": "#15151b",
  "--soft2": "#1c1c25",
  "--card": "#1b1b23",
  "--bul": "#3a3a46",
  "--blue-soft": "#182644",
  "--blue-ink": "#9dc0ff",
  "--blue-bd": "#2e3f63",
  "--teal": "#4fc4cd",
  "--amber": "#e2ab54",
  "--neg": "#f08a9e",

  // ── surfaces / structure ───────────────────────────────────────────────
  "--bg": "#0e0e14",
  "--panel": "#191921",
  "--panel2": "#1e1e27",
  "--field": "#20202a",
  // dark counterpart of the warm paper surface
  "--paper": "#14141b",
  "--line": "#2c2c38",
  "--line2": "#24242f",
  "--chip": "#262631",

  // ── text ───────────────────────────────────────────────────────────────
  "--ink": "#f2f2f7",
  "--ink2": "#c3c3d2",
  "--ink3": "#80808f",
  "--mline": "#4a4a58",

  // ── accent (legacy aliases → primary) ──────────────────────────────────
  "--asoft": "#241f3d",
  "--aline": "#37316a",
  "--acc": "#b3a8ff",

  // ── semantic status ────────────────────────────────────────────────────
  "--gsoft": "rgba(33,157,106,.16)",
  "--gline": "rgba(33,157,106,.34)",
  "--gtext": "#43c895",
  "--rsoft": "rgba(221,76,99,.15)",
  "--rline": "rgba(221,76,99,.34)",
  "--rtext": "#f08a9e",
  "--asoft2": "rgba(215,145,43,.15)",
  "--aline2": "rgba(215,145,43,.34)",
  "--atext": "#e2ab54",

  // ── skeletons ──────────────────────────────────────────────────────────
  "--skel1": "#20202a",
  "--skel2": "#2c2c38",
};

export const THEMES: Record<ThemeName, ThemeVars> = { light: LIGHT, dark: DARK };

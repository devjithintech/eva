import { useEffect, useState } from "react";

export interface ModelOption {
  id: string;
  label: string;
  sub: string;
  provider: string;
}

const MODELS_URL = import.meta.env.VITE_MODELS_URL ?? "/models";

/** Fetches the models the server will actually serve (providers with keys + demo). */
export function useModels() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(MODELS_URL)
      .then((r) => r.json())
      .then((data: { models: ModelOption[]; default: string }) => {
        if (!alive) return;
        setModels(data.models ?? []);
        setSelected((cur) => cur ?? data.default ?? data.models?.[0]?.id ?? null);
      })
      .catch(() => {
        if (alive) setModels([{ id: "demo", label: "Demo (no key)", sub: "Deterministic walkthrough", provider: "mock" }]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { models, selected: selected ?? models[0]?.id ?? "demo", setSelected };
}

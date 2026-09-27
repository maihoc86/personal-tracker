import { useEffect } from "react";
import { SETTINGS_KEY } from "./data-keys";
import { applySettings, DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./settings";
import { createPersistedStore, useStore } from "./store";

export const settingsStore = createPersistedStore<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS, {
  normalize: normalizeSettings,
});

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
}

/** Read personalization settings. */
export function useSettings(): Settings {
  return useStore(settingsStore);
}

/** Mounted once: keeps the DOM theme/accent in sync, incl. OS theme flips. */
export function useApplySettings() {
  const settings = useSettings();
  useEffect(() => {
    applySettings(settings);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);
}

/** Per-browser personalization (workspace name, theme, accent, cleanup). */

export type ThemeMode = "light" | "dark" | "system";

export type Settings = {
  boardTitle: string;
  theme: ThemeMode;
  /** Primary/accent colour as a hex string; drives highlights + completion. */
  primary: string;
  /** Hide done tasks completed more than N days ago; 0 = never hide. */
  archiveDays: number;
};

export const DEFAULT_SETTINGS: Settings = {
  boardTitle: "Personal Tracker",
  theme: "system",
  primary: "#1f8a65",
  archiveDays: 90,
};

/** Choices for the auto-hide threshold (Settings). */
export const ARCHIVE_DAY_OPTIONS = [
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
  { label: "180 ngày", value: 180 },
  { label: "1 năm", value: 365 },
  { label: "Không ẩn", value: 0 },
];

/** Choices for the manual "purge old done tasks" action (Settings). */
export const PURGE_DAY_OPTIONS = [
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
  { label: "180 ngày", value: 180 },
  { label: "1 năm", value: 365 },
];

// Hue-ordered accents that read well on the sage-graphite canvas; the custom
// picker covers anything in between. Red is left out on purpose — it means
// "overdue/urgent" everywhere else.
export const PRIMARY_COLORS = [
  { name: "Ngọc bích", value: "#1f8a65" },
  { name: "Mòng két", value: "#0e7c86" },
  { name: "Cobalt", value: "#3358d4" },
  { name: "Tím", value: "#6e56cf" },
  { name: "Hồng", value: "#c2255c" },
  { name: "Hổ phách", value: "#c27803" },
  { name: "Đất nung", value: "#b7704f" },
  { name: "Than chì", value: "#4a524a" },
];

/** True when `value` is not one of the listed presets (i.e. user-picked). */
export function isCustomColor(value: string, presets: { value: string }[]): boolean {
  if (!value.startsWith("#")) return false;
  return !presets.some((p) => p.value.toLowerCase() === value.toLowerCase());
}

/**
 * Scale a hex colour down (preserving hue) until its WCAG relative luminance
 * is ≤ `max`. Colours already below `max` pass through unchanged.
 */
function darkenToLuminance(hex: string, max: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return hex;
  const r0 = parseInt(c.slice(0, 2), 16);
  const g0 = parseInt(c.slice(2, 4), 16);
  const b0 = parseInt(c.slice(4, 6), 16);
  const toLin = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const lumAt = (k: number) =>
    0.2126 * toLin(r0 * k) + 0.7152 * toLin(g0 * k) + 0.0722 * toLin(b0 * k);
  let k = 1;
  if (lumAt(1) > max) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (lumAt(mid) <= max) lo = mid;
      else hi = mid;
    }
    k = lo;
  }
  const hex2 = (n: number) => Math.round(n * k).toString(16).padStart(2, "0");
  return `#${hex2(r0)}${hex2(g0)}${hex2(b0)}`;
}

/**
 * Darken an accent only as much as needed so white text clears ~4.5:1
 * contrast on a solid fill (0.183 = that luminance).
 */
export function strongAccent(hex: string): string {
  return darkenToLuminance(hex, 0.183);
}

/** Resolve "system" to the OS preference; "light"/"dark" pass through. */
export function isDarkTheme(theme: ThemeMode): boolean {
  if (theme === "system") {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }
  return theme === "dark";
}

/** Merge stored settings over defaults, dropping invalid values. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    boardTitle: typeof r.boardTitle === "string" ? r.boardTitle : DEFAULT_SETTINGS.boardTitle,
    theme: r.theme === "light" || r.theme === "dark" || r.theme === "system" ? r.theme : DEFAULT_SETTINGS.theme,
    primary:
      typeof r.primary === "string" && /^#[0-9a-f]{6}$/i.test(r.primary) ? r.primary : DEFAULT_SETTINGS.primary,
    archiveDays:
      typeof r.archiveDays === "number" && r.archiveDays >= 0 ? r.archiveDays : DEFAULT_SETTINGS.archiveDays,
  };
}

/** Push the current settings into the DOM (theme class + accent vars). */
export function applySettings(s: Settings) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDarkTheme(s.theme));
  root.style.setProperty("--color-accent", s.primary);
  root.style.setProperty("--color-accent-strong", strongAccent(s.primary));
}

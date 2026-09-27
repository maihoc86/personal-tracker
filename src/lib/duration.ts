/** Parse and format durations typed by hand ("1h30", "45m", "1g30p", "1.5h"). */

const UNIT_PATTERN = /(\d+(?:[.,]\d+)?)\s*(h|g|giờ|gio|m|p|phút|phut)?/gi;

/**
 * Minutes represented by `input`, or null when it is not a duration.
 * A bare number uses `defaultUnit`; "1h30" reads the trailing number as minutes.
 */
export function parseDuration(
  input: string,
  defaultUnit: "h" | "m" = "m",
): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (!/^[\d\s.,hgmpiờoút]+$/i.test(text)) return null;

  let total = 0;
  let matched = false;
  let lastUnit: "h" | "m" | null = null;
  for (const match of text.matchAll(UNIT_PATTERN)) {
    const value = Number(match[1].replace(",", "."));
    if (Number.isNaN(value)) return null;
    const unit: "h" | "m" = normalizeUnit(match[2]) ?? (lastUnit === "h" ? "m" : defaultUnit);
    total += unit === "h" ? value * 60 : value;
    lastUnit = unit;
    matched = true;
  }
  if (!matched || total <= 0) return null;
  return Math.round(total);
}

function normalizeUnit(raw: string | undefined): "h" | "m" | null {
  if (!raw) return null;
  return /^(h|g|giờ|gio)$/i.test(raw) ? "h" : "m";
}

/** 95 → "1h 35m", 60 → "1h", 45 → "45m", 0 → "0m". */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** 1.5 → "1.5h", 2 → "2h". */
export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(1))}h`;
}

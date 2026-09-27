/** Day-level date helpers. Dates are local "yyyy-mm-dd" strings throughout. */

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WEEKDAY_LONG = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/**
 * Format a Date as a local yyyy-mm-dd string. Using local components (not
 * toISOString, which is UTC) keeps due dates aligned with calendar cells and
 * the native date input regardless of the user's timezone.
 */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parse a yyyy-mm-dd string as local midnight. */
export function parseIso(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseIso(value).getTime());
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / DAY_MS);
}

/** Monday of the week containing `iso`. */
export function startOfWeekIso(iso: string): string {
  const offset = (parseIso(iso).getDay() + 6) % 7;
  return addDaysIso(iso, -offset);
}

export function isWeekend(iso: string): boolean {
  const day = parseIso(iso).getDay();
  return day === 0 || day === 6;
}

/** Short Vietnamese label like "12 Th6" for chips and calendar cells. */
export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = parseIso(iso);
  return `${d.getDate()} Th${d.getMonth() + 1}`;
}

/** "Thứ Bảy, 27/9/2026" for dialog titles. */
export function formatFullDate(iso: string): string {
  const d = parseIso(iso);
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Friendly day name relative to `today`: "Hôm nay", "Ngày mai", "T4, 1 Th10". */
export function formatDayLabel(iso: string, today = todayIso()): string {
  const delta = diffDays(today, iso);
  if (delta === 0) return "Hôm nay";
  if (delta === 1) return "Ngày mai";
  if (delta === -1) return "Hôm qua";
  return `${WEEKDAY_SHORT[parseIso(iso).getDay()]}, ${formatShortDate(iso)}`;
}

/** Relative urgency used to colour due-date chips. */
export function dueState(
  iso: string,
  today = todayIso(),
): "none" | "overdue" | "today" | "soon" | "upcoming" {
  if (!iso) return "none";
  if (iso < today) return "overdue";
  if (iso === today) return "today";
  if (diffDays(today, iso) <= 2) return "soon";
  return "upcoming";
}

/** "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "12 Th9". */
export function formatRelativeTime(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = diffDays(toIsoDate(new Date(at)), toIsoDate(new Date(now)));
  if (days === 1) return "hôm qua";
  if (days < 7) return `${days} ngày trước`;
  return formatShortDate(toIsoDate(new Date(at)));
}

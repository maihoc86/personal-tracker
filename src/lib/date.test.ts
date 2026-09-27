import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  diffDays,
  dueState,
  formatDayLabel,
  formatFullDate,
  formatRelativeTime,
  formatShortDate,
  isIsoDate,
  isWeekend,
  startOfWeekIso,
  toIsoDate,
} from "./date";

describe("date helpers", () => {
  it("formats local dates as yyyy-mm-dd", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds days across month boundaries", () => {
    expect(addDaysIso("2026-09-29", 3)).toBe("2026-10-02");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("measures whole days between dates", () => {
    expect(diffDays("2026-09-27", "2026-10-01")).toBe(4);
    expect(diffDays("2026-10-01", "2026-09-27")).toBe(-4);
  });

  it("finds the Monday of a week", () => {
    expect(startOfWeekIso("2026-09-27")).toBe("2026-09-21"); // Sunday
    expect(startOfWeekIso("2026-09-21")).toBe("2026-09-21"); // Monday
  });

  it("detects weekends", () => {
    expect(isWeekend("2026-09-26")).toBe(true);
    expect(isWeekend("2026-09-28")).toBe(false);
  });

  it("validates iso strings", () => {
    expect(isIsoDate("2026-09-27")).toBe(true);
    expect(isIsoDate("27/09/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("labels days relative to today", () => {
    const today = "2026-09-27";
    expect(formatDayLabel(today, today)).toBe("Hôm nay");
    expect(formatDayLabel("2026-09-28", today)).toBe("Ngày mai");
    expect(formatDayLabel("2026-09-26", today)).toBe("Hôm qua");
    expect(formatDayLabel("2026-10-01", today)).toBe("T5, 1 Th10");
  });

  it("formats short and full dates", () => {
    expect(formatShortDate("2026-06-12")).toBe("12 Th6");
    expect(formatShortDate("")).toBe("");
    expect(formatFullDate("2026-09-27")).toBe("Chủ nhật, 27/9/2026");
  });

  it("classifies due urgency", () => {
    const today = "2026-09-27";
    expect(dueState("", today)).toBe("none");
    expect(dueState("2026-09-20", today)).toBe("overdue");
    expect(dueState(today, today)).toBe("today");
    expect(dueState("2026-09-29", today)).toBe("soon");
    expect(dueState("2026-10-10", today)).toBe("upcoming");
  });

  it("describes relative time", () => {
    const now = new Date(2026, 8, 27, 12, 0).getTime();
    expect(formatRelativeTime(now - 20_000, now)).toBe("vừa xong");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 phút trước");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3 giờ trước");
    expect(formatRelativeTime(new Date(2026, 8, 26, 9).getTime(), now)).toBe("hôm qua");
    expect(formatRelativeTime(new Date(2026, 8, 23, 9).getTime(), now)).toBe("4 ngày trước");
    expect(formatRelativeTime(new Date(2026, 8, 1, 9).getTime(), now)).toBe("1 Th9");
  });
});

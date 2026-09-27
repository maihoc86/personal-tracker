import { describe, expect, it } from "vitest";
import { currentStreak, migrateHabits, recentDays } from "./use-habits";

describe("habits", () => {
  it("sanitizes stored habits", () => {
    expect(
      migrateHabits([{ id: "a", name: "Đọc", done: ["2026-09-27", "2026-09-27", "bad", 3] }, { id: 1 }]),
    ).toEqual([{ id: "a", name: "Đọc", done: ["2026-09-27"] }]);
    expect(migrateHabits(null)).toEqual([]);
  });

  it("counts a streak ending today or yesterday", () => {
    const today = "2026-09-27";
    expect(currentStreak(["2026-09-27", "2026-09-26", "2026-09-24"], today)).toBe(2);
    expect(currentStreak(["2026-09-26", "2026-09-25"], today)).toBe(2);
    expect(currentStreak(["2026-09-20"], today)).toBe(0);
  });

  it("lists recent days oldest first", () => {
    const days = recentDays(["2026-09-27"], 3, "2026-09-27");
    expect(days).toEqual([
      { iso: "2026-09-25", done: false, isToday: false },
      { iso: "2026-09-26", done: false, isToday: false },
      { iso: "2026-09-27", done: true, isToday: true },
    ]);
  });
});

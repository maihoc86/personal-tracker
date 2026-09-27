import { describe, expect, it } from "vitest";
import { describeRecurrence, nextDueDate, stepRecurrence } from "./recurrence";

describe("stepRecurrence", () => {
  it("steps daily and weekly by the interval", () => {
    expect(stepRecurrence("2026-09-27", { freq: "daily", interval: 2 })).toBe("2026-09-29");
    expect(stepRecurrence("2026-09-27", { freq: "weekly", interval: 1 })).toBe("2026-10-04");
  });

  it("skips weekends for weekdays", () => {
    // Friday → Monday
    expect(stepRecurrence("2026-09-25", { freq: "weekdays", interval: 1 })).toBe("2026-09-28");
  });

  it("clamps monthly steps to the end of shorter months", () => {
    expect(stepRecurrence("2026-01-31", { freq: "monthly", interval: 1 })).toBe("2026-02-28");
    expect(stepRecurrence("2026-11-15", { freq: "monthly", interval: 2 })).toBe("2027-01-15");
  });

  it("treats a missing interval as 1", () => {
    expect(stepRecurrence("2026-09-27", { freq: "daily", interval: 0 })).toBe("2026-09-28");
  });
});

describe("nextDueDate", () => {
  const today = "2026-09-27";

  it("moves a future due date by one step", () => {
    expect(nextDueDate("2026-09-30", { freq: "weekly", interval: 1 }, today)).toBe("2026-10-07");
  });

  it("catches an overdue task up to after today", () => {
    expect(nextDueDate("2026-09-20", { freq: "daily", interval: 1 }, today)).toBe("2026-09-28");
    // weekly keeps the weekday of the original due date (Monday 21 → Monday 28)
    expect(nextDueDate("2026-09-14", { freq: "weekly", interval: 1 }, today)).toBe("2026-09-28");
  });

  it("starts from today when there is no due date", () => {
    expect(nextDueDate("", { freq: "daily", interval: 1 }, today)).toBe("2026-09-28");
  });
});

describe("describeRecurrence", () => {
  it.each([
    [{ freq: "daily", interval: 1 }, "Hằng ngày"],
    [{ freq: "daily", interval: 3 }, "Mỗi 3 ngày"],
    [{ freq: "weekdays", interval: 1 }, "Ngày làm việc (T2–T6)"],
    [{ freq: "weekly", interval: 1 }, "Hằng tuần"],
    [{ freq: "weekly", interval: 2 }, "Mỗi 2 tuần"],
    [{ freq: "monthly", interval: 1 }, "Hằng tháng"],
    [{ freq: "monthly", interval: 6 }, "Mỗi 6 tháng"],
  ] as const)("describes %j", (rule, label) => {
    expect(describeRecurrence(rule)).toBe(label);
  });
});

import { describe, expect, it } from "vitest";
import { formatHours, formatMinutes, parseDuration } from "./duration";

describe("parseDuration", () => {
  it.each([
    ["45m", 45],
    ["1h", 60],
    ["1h30", 90],
    ["1h 30m", 90],
    ["1.5h", 90],
    ["1,5h", 90],
    ["2g", 120],
    ["1g30p", 90],
    ["30 phút", 30],
  ])("parses %s", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });

  it("uses the default unit for bare numbers", () => {
    expect(parseDuration("20")).toBe(20);
    expect(parseDuration("2", "h")).toBe(120);
  });

  it.each(["", "abc", "0", "1x", "-5m"])("rejects %j", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats minutes compactly", () => {
    expect(formatMinutes(95)).toBe("1h 35m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(-3)).toBe("0m");
  });

  it("formats hours without trailing zeros", () => {
    expect(formatHours(1.5)).toBe("1.5h");
    expect(formatHours(2)).toBe("2h");
    expect(formatHours(1.25)).toBe("1.3h");
  });
});

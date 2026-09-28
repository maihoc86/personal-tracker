import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, isCustomColor, normalizeSettings, PRIMARY_COLORS, strongAccent } from "./settings";

describe("settings", () => {
  it("normalizes stored settings, dropping legacy/invalid fields", () => {
    expect(normalizeSettings({ boardTitle: "Của tôi", theme: "dark", background: "/bg.jpg", primary: "red" })).toEqual({
      ...DEFAULT_SETTINGS,
      boardTitle: "Của tôi",
      theme: "dark",
    });
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ archiveDays: -1 }).archiveDays).toBe(DEFAULT_SETTINGS.archiveDays);
  });

  it("normalizes capacity and reminder settings", () => {
    const s = normalizeSettings({ capacityHours: 30, reminders: { enabled: false, leadMinutes: -5, digestTime: "25:00" } });
    expect(s.capacityHours).toBe(DEFAULT_SETTINGS.capacityHours);
    expect(s.reminders).toEqual({ enabled: false, leadMinutes: 15, digestTime: "08:30" });
    expect(normalizeSettings({ reminders: { digestTime: "" } }).reminders.digestTime).toBe("");
  });

  it("detects custom colours", () => {
    expect(isCustomColor(PRIMARY_COLORS[0].value.toUpperCase(), PRIMARY_COLORS)).toBe(false);
    expect(isCustomColor("#123456", PRIMARY_COLORS)).toBe(true);
    expect(isCustomColor("red", PRIMARY_COLORS)).toBe(false);
  });

  it("darkens bright accents but keeps dark ones", () => {
    expect(strongAccent("#1f2937")).toBe("#1f2937");
    expect(strongAccent("#ffff00")).not.toBe("#ffff00");
    expect(strongAccent("#abc")).toBe("#abc");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { DATA_KEYS } from "../../lib/data-keys";
import { BACKUP_VERSION, createBackup, parseBackup } from "./backup";
import { buildSampleData } from "./sample-data";

beforeEach(() => window.localStorage.clear());

describe("createBackup / parseBackup", () => {
  it("round-trips the workspace", () => {
    const sample = buildSampleData("2026-09-27", 0);
    window.localStorage.setItem(DATA_KEYS.todos, JSON.stringify(sample.tasks));
    window.localStorage.setItem(DATA_KEYS.projects, JSON.stringify(sample.projects));
    const file = createBackup(new Date("2026-09-27T00:00:00Z"));
    expect(file).toMatchObject({ app: "personal-tracker", version: BACKUP_VERSION });

    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.tasks).toEqual(sample.tasks);
    expect(parsed.data.projects).toEqual(sample.projects);
    expect(parsed.data.notes).toEqual([]);
    expect(parsed.data.settings.theme).toBe("system");
  });

  it.each([
    ["not json", "{", "JSON"],
    ["a foreign file", JSON.stringify({ hello: 1 }), "không phải bản sao lưu"],
    ["a newer version", JSON.stringify({ app: "personal-tracker", version: 99, data: { tasks: [] } }), "mới hơn"],
    ["missing tasks", JSON.stringify({ app: "personal-tracker", version: 2, data: {} }), "thiếu"],
    ["null", "null", "không phải bản sao lưu"],
  ])("rejects %s", (_, text, message) => {
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(message);
  });

  it("sanitizes invalid records inside a valid envelope", () => {
    const parsed = parseBackup(
      JSON.stringify({
        app: "personal-tracker",
        version: 1,
        data: { tasks: [{ id: "a", title: "ok" }, { bad: true }], bookmarks: [{ id: "b", url: "javascript:alert(1)" }] },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.tasks.map((t) => t.id)).toEqual(["a"]);
    expect(parsed.data.bookmarks).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { migrateNotes, notesFromLegacy, noteTitle, sortNotes, type Note } from "./note-types";

const note = (o: Partial<Note>): Note => ({
  id: "n",
  title: "",
  content: "",
  projectId: "",
  pinned: false,
  createdAt: 0,
  updatedAt: 0,
  ...o,
});

describe("migrateNotes", () => {
  it("sanitizes and dedupes", () => {
    expect(
      migrateNotes([{ id: "a", title: 1, content: "x", createdAt: 5 }, { id: "a" }, null, { title: "no id" }]),
    ).toEqual([note({ id: "a", content: "x", createdAt: 5, updatedAt: 5 })]);
    expect(migrateNotes("x")).toEqual([]);
  });
});

describe("notesFromLegacy", () => {
  it("turns the old scratch note into a pinned page", () => {
    const [n] = notesFromLegacy("Việc tuần này\n- a", "id", 9);
    expect(n).toMatchObject({ id: "id", title: "Việc tuần này", pinned: true, createdAt: 9 });
  });

  it("ignores empty or non-string values", () => {
    expect(notesFromLegacy("   ", "id", 1)).toEqual([]);
    expect(notesFromLegacy(undefined, "id", 1)).toEqual([]);
  });
});

describe("sortNotes / noteTitle", () => {
  it("puts pinned first, then newest", () => {
    const list = [note({ id: "a", updatedAt: 1 }), note({ id: "b", updatedAt: 3 }), note({ id: "c", pinned: true })];
    expect(sortNotes(list).map((n) => n.id)).toEqual(["c", "b", "a"]);
  });

  it("falls back to the first line of content", () => {
    expect(noteTitle(note({ title: "Họp" }))).toBe("Họp");
    expect(noteTitle(note({ content: "## Kế hoạch\nabc" }))).toBe("Kế hoạch");
    expect(noteTitle(note({}))).toBe("Trang chưa đặt tên");
  });
});

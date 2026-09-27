import { beforeEach, describe, expect, it, vi } from "vitest";
import { noteActions, noteStore } from "./note-store";

beforeEach(() => {
  vi.useRealTimers();
  noteStore.set([]);
});

describe("noteActions", () => {
  it("adds, updates and bumps updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const n = noteActions.add({ title: "Họp" });
    vi.setSystemTime(5000);
    noteActions.update(n.id, { content: "## Kế hoạch", pinned: true });
    expect(noteStore.get()[0]).toMatchObject({ title: "Họp", content: "## Kế hoạch", pinned: true, createdAt: 1000, updatedAt: 5000 });
  });

  it("removes and restores in place", () => {
    const a = noteActions.add();
    const b = noteActions.add();
    const removed = noteActions.remove(a.id)!;
    expect(noteStore.get().map((n) => n.id)).toEqual([b.id]);
    noteActions.restore(removed.note, removed.index);
    noteActions.restore(removed.note, removed.index);
    expect(noteStore.get().map((n) => n.id)).toEqual([b.id, a.id]);
    expect(noteActions.remove("missing")).toBeNull();
  });
});

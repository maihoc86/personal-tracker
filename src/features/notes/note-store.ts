import { DATA_KEYS, LEGACY_NOTE_KEY } from "../../lib/data-keys";
import { createId } from "../../lib/id";
import { readStorage } from "../../lib/persistence";
import { createPersistedStore, useStore } from "../../lib/store";
import { migrateNotes, notesFromLegacy, type Note } from "./note-types";

/** Notes change on every keystroke — debounce the write. */
export const noteStore = createPersistedStore<Note[]>(DATA_KEYS.notes, [], {
  normalize: migrateNotes,
  debounce: 400,
  // Users upgrading from the single-note dashboard keep their text as page one.
  whenEmpty: () => notesFromLegacy(readStorage(LEGACY_NOTE_KEY), createId(), Date.now()),
});

export const noteActions = {
  add(partial: Partial<Pick<Note, "title" | "content" | "projectId">> = {}): Note {
    const now = Date.now();
    const note: Note = {
      id: createId(),
      title: partial.title ?? "",
      content: partial.content ?? "",
      projectId: partial.projectId ?? "",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    noteStore.set((prev) => [note, ...prev]);
    return note;
  },

  update(id: string, patch: Partial<Pick<Note, "title" | "content" | "projectId" | "pinned">>) {
    noteStore.set((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    );
  },

  remove(id: string): { note: Note; index: number } | null {
    const list = noteStore.get();
    const index = list.findIndex((n) => n.id === id);
    if (index < 0) return null;
    noteStore.set(list.filter((n) => n.id !== id));
    return { note: list[index], index };
  },

  restore(note: Note, index: number) {
    noteStore.set((prev) => {
      if (prev.some((n) => n.id === note.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, note);
      return next;
    });
  },
};

export function useNotes(): Note[] {
  return useStore(noteStore);
}

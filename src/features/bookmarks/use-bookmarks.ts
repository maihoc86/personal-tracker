import { DATA_KEYS } from "../../lib/data-keys";
import { createId } from "../../lib/id";
import { createPersistedStore, useStore } from "../../lib/store";
import { normalizeUrl, titleFromUrl } from "../../lib/url";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  /** Empty string means "ungrouped". */
  group: string;
  createdAt: number;
};

export type BookmarkDraft = { url: string; title: string; group: string };

export function migrateBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b) => {
    if (typeof b !== "object" || b === null) return [];
    const { id, url, title, group, createdAt } = b as Record<string, unknown>;
    if (typeof id !== "string" || typeof url !== "string" || !/^https?:\/\//i.test(url)) return [];
    return [
      {
        id,
        url,
        title: typeof title === "string" ? title : url,
        group: typeof group === "string" ? group : "",
        createdAt: typeof createdAt === "number" ? createdAt : 0,
      },
    ];
  });
}

export function migrateGroups(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((g): g is string => typeof g === "string" && g.trim() !== ""))];
}

export const bookmarkStore = createPersistedStore<Bookmark[]>(DATA_KEYS.bookmarks, [], {
  normalize: migrateBookmarks,
});
export const groupStore = createPersistedStore<string[]>(DATA_KEYS.groups, [], {
  normalize: migrateGroups,
});

/**
 * Bookmark store. Groups are first-class entities (their own list) so a group
 * can be created/kept independently of whether any bookmark uses it.
 */
export function useBookmarks() {
  const bookmarks = useStore(bookmarkStore);
  const groups = useStore(groupStore);

  function addGroup(name: string) {
    const clean = name.trim();
    if (!clean) return;
    groupStore.set((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }

  function addBookmark(draft: BookmarkDraft) {
    const url = normalizeUrl(draft.url);
    if (!url) return;
    const group = draft.group.trim();
    if (group) addGroup(group);
    bookmarkStore.set((prev) => [
      {
        id: createId(),
        url,
        title: draft.title.trim() || titleFromUrl(url),
        group,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }

  function removeBookmark(id: string) {
    bookmarkStore.set((prev) => prev.filter((b) => b.id !== id));
  }

  /** Delete a group entity and detach any bookmarks that referenced it. */
  function removeGroup(name: string) {
    groupStore.set((prev) => prev.filter((g) => g !== name));
    bookmarkStore.set((prev) => prev.map((b) => (b.group === name ? { ...b, group: "" } : b)));
  }

  /** Rename a group and re-point every bookmark that used the old name. */
  function renameGroup(from: string, to: string) {
    const clean = to.trim();
    if (!clean || clean === from || groups.includes(clean)) return;
    groupStore.set((prev) => prev.map((g) => (g === from ? clean : g)));
    bookmarkStore.set((prev) => prev.map((b) => (b.group === from ? { ...b, group: clean } : b)));
  }

  return { bookmarks, groups, addGroup, addBookmark, removeBookmark, removeGroup, renameGroup };
}

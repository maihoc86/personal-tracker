/** Every localStorage key holding user data (settings are kept separately). */
export const DATA_KEYS = {
  todos: "pt.todos",
  projects: "pt.projects",
  notes: "pt.notes",
  habits: "pt.habits",
  bookmarks: "pt.bookmarks",
  groups: "pt.bookmark-groups",
  focus: "pt.focus",
  workflows: "pt.workflows",
} as const;

/** Pre-workspace single scratch note; migrated into the first note page. */
export const LEGACY_NOTE_KEY = "pt.note";

export const SETTINGS_KEY = "pt.settings";

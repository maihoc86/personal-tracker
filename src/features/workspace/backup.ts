import { DATA_KEYS, LEGACY_NOTE_KEY, SETTINGS_KEY } from "../../lib/data-keys";
import { readStorage, suspendPersistence } from "../../lib/persistence";
import { normalizeSettings, type Settings } from "../../lib/settings";
import { migrateBookmarks, migrateGroups, type Bookmark } from "../bookmarks/use-bookmarks";
import { migrateFocus, type FocusState } from "../focus/focus-model";
import { migrateHabits, type Habit } from "../habits/use-habits";
import { migrateNotes, type Note } from "../notes/note-types";
import { migrateProjects, type Project } from "../projects/project-types";
import { migrateTasks } from "../tasks/task-model";
import type { Task } from "../tasks/task-types";

export const BACKUP_APP = "personal-tracker";
export const BACKUP_VERSION = 2;

export type BackupData = {
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  habits: Habit[];
  bookmarks: Bookmark[];
  groups: string[];
  focus: FocusState;
  settings: Settings;
};

export type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<keyof BackupData, unknown>;
};

export type ParsedBackup =
  | { ok: true; data: BackupData; exportedAt: string }
  | { ok: false; error: string };

/** Snapshot of everything in storage, ready to download. */
export function createBackup(now = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      tasks: readStorage(DATA_KEYS.todos) ?? [],
      projects: readStorage(DATA_KEYS.projects) ?? [],
      notes: readStorage(DATA_KEYS.notes) ?? [],
      habits: readStorage(DATA_KEYS.habits) ?? [],
      bookmarks: readStorage(DATA_KEYS.bookmarks) ?? [],
      groups: readStorage(DATA_KEYS.groups) ?? [],
      focus: readStorage(DATA_KEYS.focus) ?? null,
      settings: readStorage(SETTINGS_KEY) ?? null,
    },
  };
}

/**
 * Validate an uploaded file. The envelope must be ours; every collection is
 * then run through the same sanitizers used on load, so a hand-edited file
 * can't put invalid records into the workspace.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "File không phải JSON hợp lệ." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "File không phải bản sao lưu Personal Tracker." };
  }
  const file = raw as Partial<BackupFile>;
  if (file.app !== BACKUP_APP || typeof file.data !== "object" || file.data === null) {
    return { ok: false, error: "File không phải bản sao lưu Personal Tracker." };
  }
  if (typeof file.version !== "number" || file.version > BACKUP_VERSION) {
    return { ok: false, error: `Bản sao lưu dùng định dạng v${String(file.version)} — mới hơn ứng dụng này (v${BACKUP_VERSION}).` };
  }
  const d = file.data as Record<string, unknown>;
  if (!Array.isArray(d.tasks)) {
    return { ok: false, error: "Bản sao lưu thiếu danh sách task." };
  }
  return {
    ok: true,
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "",
    data: {
      tasks: migrateTasks(d.tasks),
      projects: migrateProjects(d.projects),
      notes: migrateNotes(d.notes),
      habits: migrateHabits(d.habits),
      bookmarks: migrateBookmarks(d.bookmarks),
      groups: migrateGroups(d.groups),
      focus: migrateFocus(d.focus),
      settings: normalizeSettings(d.settings),
    },
  };
}

/** Replace the whole workspace with a parsed backup, then reload. */
export function restoreBackup(data: BackupData) {
  suspendPersistence();
  const store = window.localStorage;
  store.setItem(DATA_KEYS.todos, JSON.stringify(data.tasks));
  store.setItem(DATA_KEYS.projects, JSON.stringify(data.projects));
  store.setItem(DATA_KEYS.notes, JSON.stringify(data.notes));
  store.setItem(DATA_KEYS.habits, JSON.stringify(data.habits));
  store.setItem(DATA_KEYS.bookmarks, JSON.stringify(data.bookmarks));
  store.setItem(DATA_KEYS.groups, JSON.stringify(data.groups));
  store.setItem(DATA_KEYS.focus, JSON.stringify({ ...data.focus, running: false, endsAt: null }));
  store.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  store.removeItem(LEGACY_NOTE_KEY);
  window.location.reload();
}

/** Trigger a browser download of the current workspace. */
export function downloadBackup(now = new Date()) {
  const file = createBackup(now);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `personal-tracker-${now.toISOString().slice(0, 10)}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { del, get, set } from "idb-keyval";
import { useEffect } from "react";
import { toIsoDate } from "../../lib/date";
import { createMemoryStore, createPersistedStore, useStore, type Store } from "../../lib/store";
import { settingsStore } from "../../lib/use-settings";
import { bookmarkStore, groupStore } from "../bookmarks/use-bookmarks";
import { habitStore } from "../habits/use-habits";
import { noteStore } from "../notes/note-store";
import { projectStore } from "../projects/project-store";
import { taskStore } from "../tasks/task-store";
import { workflowStore } from "../workflow/workflow-store";
import { createBackup, parseBackup, restoreBackup } from "../workspace/backup";
import {
  BACKUP_DELAY_MS,
  LATEST_FILE,
  filesToPrune,
  initialAutoBackup,
  migrateAutoBackup,
  snapshotFileName,
  upsertSnapshot,
  type AutoBackupSettings,
  type LocalSnapshot,
  type Permission,
} from "./auto-backup-model";

// Minimal File System Access API surface (not in TypeScript's DOM lib yet).
type Writable = { write(data: string): Promise<void>; close(): Promise<void> };
export type DirHandle = {
  name: string;
  queryPermission(o: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(o: { mode: "readwrite" }): Promise<PermissionState>;
  getFileHandle(name: string, o: { create: boolean }): Promise<{ createWritable(): Promise<Writable> }>;
  removeEntry(name: string): Promise<void>;
  keys(): AsyncIterable<string>;
};
type PickerWindow = Window & { showDirectoryPicker?: (o: { id?: string; mode: "readwrite" }) => Promise<DirHandle> };

const HANDLE_KEY = "pt.backup-dir";
const SNAPSHOTS_KEY = "pt.snapshots";

export const autoBackupStore = createPersistedStore<AutoBackupSettings>("pt.auto-backup", initialAutoBackup(), {
  normalize: migrateAutoBackup,
});
export const permissionStore = createMemoryStore<Permission>("none");

export function isFolderBackupSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showDirectoryPicker === "function";
}

const patch = (p: Partial<AutoBackupSettings>) => autoBackupStore.set((s) => ({ ...s, ...p }));

async function loadHandle(): Promise<DirHandle | undefined> {
  try {
    return await get<DirHandle>(HANDLE_KEY);
  } catch {
    return undefined;
  }
}

async function writeFile(dir: DirHandle, name: string, text: string) {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

function describeError(e: unknown): string {
  if (e instanceof DOMException && e.name === "NotFoundError") return "Không tìm thấy thư mục sao lưu — hãy chọn lại.";
  if (e instanceof DOMException && e.name === "QuotaExceededError") return "Ổ đĩa đã đầy, không ghi được bản sao lưu.";
  if (e instanceof DOMException && e.name === "NotAllowedError") return "Trình duyệt chưa cho phép ghi vào thư mục.";
  return "Không ghi được bản sao lưu vào thư mục.";
}

async function saveLocalSnapshot(day: string, file: unknown, at: number) {
  try {
    const list = (await get<LocalSnapshot[]>(SNAPSHOTS_KEY)) ?? [];
    await set(SNAPSHOTS_KEY, upsertSnapshot(list, { day, at, file }));
  } catch {
    // IndexedDB unavailable (private mode) — the folder copy still runs.
  }
}

/** Snapshot into the browser and, when a folder is connected, write the files. */
export async function runBackup(now = new Date()): Promise<void> {
  const file = createBackup(now);
  await saveLocalSnapshot(toIsoDate(now), file, now.getTime());
  if (!autoBackupStore.get().enabled) return;

  const dir = await loadHandle();
  if (!dir) {
    patch({ enabled: false, folderName: "" });
    return;
  }
  const permission = await dir.queryPermission({ mode: "readwrite" });
  permissionStore.set(permission);
  if (permission !== "granted") return;

  try {
    const text = JSON.stringify(file, null, 2);
    await writeFile(dir, LATEST_FILE, text);
    await writeFile(dir, snapshotFileName(now), text);
    const names: string[] = [];
    for await (const name of dir.keys()) names.push(name);
    for (const name of filesToPrune(names)) await dir.removeEntry(name);
    patch({ lastBackupAt: now.getTime(), lastSafeAt: now.getTime(), lastError: "" });
  } catch (e) {
    patch({ lastError: describeError(e) });
  }
}

export const autoBackupActions = {
  /** Pick (or change) the backup folder — must run from a click. */
  async chooseFolder(): Promise<boolean> {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) return false;
    let dir: DirHandle;
    try {
      dir = await picker({ id: "personal-tracker-backup", mode: "readwrite" });
    } catch {
      return false; // cancelled
    }
    await set(HANDLE_KEY, dir);
    permissionStore.set("granted");
    patch({ enabled: true, folderName: dir.name, lastError: "" });
    await runBackup();
    return true;
  },

  /** Browsers drop folder permission after a restart; re-grant from a click. */
  async resume(): Promise<boolean> {
    const dir = await loadHandle();
    if (!dir) return false;
    const permission = await dir.requestPermission({ mode: "readwrite" });
    permissionStore.set(permission);
    if (permission === "granted") await runBackup();
    return permission === "granted";
  },

  async disable() {
    await del(HANDLE_KEY).catch(() => {});
    permissionStore.set("none");
    patch({ enabled: false, folderName: "", lastError: "" });
  },

  /** A manual JSON export also counts as a safe copy. */
  markExported() {
    patch({ lastSafeAt: Date.now() });
  },

  /**
   * Keep what's about to be wiped (clear, sample data, restore) as a
   * separate snapshot that pruning never touches.
   */
  async snapshotBeforeReset() {
    const now = new Date();
    const file = createBackup(now);
    await saveLocalSnapshot(`${toIsoDate(now)} · trước khi thay dữ liệu`, file, now.getTime());
    const dir = autoBackupStore.get().enabled ? await loadHandle() : undefined;
    if (dir && (await dir.queryPermission({ mode: "readwrite" })) === "granted") {
      await writeFile(dir, `personal-tracker-truoc-khi-xoa-${now.getTime()}.json`, JSON.stringify(file, null, 2)).catch(() => {});
    }
  },

  async listSnapshots(): Promise<LocalSnapshot[]> {
    try {
      return (await get<LocalSnapshot[]>(SNAPSHOTS_KEY)) ?? [];
    } catch {
      return [];
    }
  },

  /** Restore a browser snapshot; returns an error message or null. */
  async restoreSnapshot(snapshot: LocalSnapshot): Promise<string | null> {
    const parsed = parseBackup(JSON.stringify(snapshot.file));
    if (!parsed.ok) return parsed.error;
    await autoBackupActions.snapshotBeforeReset();
    restoreBackup(parsed.data);
    return null;
  },
};

/** Stores whose changes should trigger a backup (focus ticks are ignored). */
const WATCHED: Store<unknown>[] = [
  taskStore,
  projectStore,
  noteStore,
  habitStore,
  bookmarkStore,
  groupStore,
  workflowStore,
  settingsStore,
] as Store<unknown>[];

/**
 * Mounted once by the app: learns whether the folder is still writable,
 * takes today's snapshot shortly after start, then backs up a minute after
 * the last change (right away when the tab is hidden).
 */
export function useAutoBackupScheduler() {
  useEffect(() => {
    let timer: number | undefined;
    let running = false;
    let pending = false;

    const run = async () => {
      window.clearTimeout(timer);
      timer = undefined;
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        await runBackup();
      } finally {
        running = false;
        if (pending) {
          pending = false;
          schedule();
        }
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), BACKUP_DELAY_MS);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && timer !== undefined) void run();
    };

    void (async () => {
      const dir = autoBackupStore.get().enabled ? await loadHandle() : undefined;
      if (dir) permissionStore.set(await dir.queryPermission({ mode: "readwrite" }).catch(() => "prompt" as const));
    })();
    const first = window.setTimeout(() => void run(), 5_000);
    const unsubscribe = WATCHED.map((s) => s.subscribe(schedule));
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      unsubscribe.forEach((u) => u());
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
}

export function useAutoBackup() {
  return { settings: useStore(autoBackupStore), permission: useStore(permissionStore) };
}

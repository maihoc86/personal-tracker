import { toIsoDate } from "../../lib/date";

/** Wait this long after the last change before writing a backup. */
export const BACKUP_DELAY_MS = 60_000;
/** Dated files kept in the backup folder. */
export const KEEP_FOLDER_DAYS = 14;
/** Daily snapshots kept inside the browser (IndexedDB). */
export const KEEP_LOCAL_DAYS = 7;
/** Nudge the user when nothing has been backed up for this long. */
export const STALE_AFTER_MS = 7 * 86_400_000;

export const LATEST_FILE = "personal-tracker-latest.json";
const DATED = /^personal-tracker-(\d{4}-\d{2}-\d{2})\.json$/;

export function snapshotFileName(at: Date): string {
  return `personal-tracker-${toIsoDate(at)}.json`;
}

/** Dated backup files beyond the newest `keep`, oldest last — safe to delete. */
export function filesToPrune(names: string[], keep = KEEP_FOLDER_DAYS): string[] {
  return names
    .filter((n) => DATED.test(n))
    .sort()
    .reverse()
    .slice(keep);
}

export type LocalSnapshot = { day: string; at: number; file: unknown };

/** Replace today's snapshot (one per day) and keep the newest `keep` days. */
export function upsertSnapshot(list: LocalSnapshot[], snapshot: LocalSnapshot, keep = KEEP_LOCAL_DAYS): LocalSnapshot[] {
  return [snapshot, ...list.filter((s) => s.day !== snapshot.day)]
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
    .slice(0, keep);
}

export type AutoBackupSettings = {
  /** A folder was chosen and writes should happen. */
  enabled: boolean;
  folderName: string;
  lastBackupAt: number | null;
  /** Last successful write of any kind (folder, manual export). */
  lastSafeAt: number | null;
  lastError: string;
};

export const initialAutoBackup = (): AutoBackupSettings => ({
  enabled: false,
  folderName: "",
  lastBackupAt: null,
  lastSafeAt: null,
  lastError: "",
});

export function migrateAutoBackup(raw: unknown): AutoBackupSettings {
  const base = initialAutoBackup();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const time = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  return {
    enabled: r.enabled === true,
    folderName: typeof r.folderName === "string" ? r.folderName : "",
    lastBackupAt: time(r.lastBackupAt),
    lastSafeAt: time(r.lastSafeAt),
    lastError: typeof r.lastError === "string" ? r.lastError : "",
  };
}

export type Permission = "granted" | "prompt" | "denied" | "none";

export type BackupHealth =
  | { kind: "ok" }
  | { kind: "paused" }
  | { kind: "error"; message: string }
  | { kind: "stale"; since: number | null };

/**
 * What the sidebar should say: paused when the folder needs permission
 * again (browsers ask after a restart), an error when the last write
 * failed, stale when nothing has left the browser for a week.
 */
export function backupHealth(s: AutoBackupSettings, permission: Permission, now: number): BackupHealth {
  if (s.enabled && permission !== "granted") return { kind: "paused" };
  if (s.enabled && s.lastError) return { kind: "error", message: s.lastError };
  if (!s.lastSafeAt || now - s.lastSafeAt > STALE_AFTER_MS) return { kind: "stale", since: s.lastSafeAt };
  return { kind: "ok" };
}

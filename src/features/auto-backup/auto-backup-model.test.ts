import { describe, expect, it } from "vitest";
import {
  STALE_AFTER_MS,
  backupHealth,
  filesToPrune,
  initialAutoBackup,
  migrateAutoBackup,
  snapshotFileName,
  upsertSnapshot,
} from "./auto-backup-model";

describe("file names", () => {
  it("names dated snapshots by local day", () => {
    expect(snapshotFileName(new Date(2026, 8, 28, 23, 59))).toBe("personal-tracker-2026-09-28.json");
  });

  it("prunes only dated files beyond the newest ones", () => {
    const names = [
      "personal-tracker-latest.json",
      "personal-tracker-2026-09-26.json",
      "personal-tracker-2026-09-28.json",
      "notes.txt",
      "personal-tracker-2026-09-27.json",
    ];
    expect(filesToPrune(names, 2)).toEqual(["personal-tracker-2026-09-26.json"]);
    expect(filesToPrune(names, 5)).toEqual([]);
  });
});

describe("upsertSnapshot", () => {
  it("keeps one snapshot per day, newest first, capped", () => {
    const list = [
      { day: "2026-09-27", at: 2, file: 1 },
      { day: "2026-09-26", at: 1, file: 1 },
    ];
    const out = upsertSnapshot(list, { day: "2026-09-27", at: 3, file: 2 }, 2);
    expect(out.map((s) => [s.day, s.at])).toEqual([
      ["2026-09-27", 3],
      ["2026-09-26", 1],
    ]);
    expect(upsertSnapshot(out, { day: "2026-09-28", at: 4, file: 3 }, 2).map((s) => s.day)).toEqual(["2026-09-28", "2026-09-27"]);
  });
});

describe("migrateAutoBackup", () => {
  it("sanitizes stored settings", () => {
    expect(migrateAutoBackup(null)).toEqual(initialAutoBackup());
    expect(migrateAutoBackup({ enabled: true, folderName: "Backups", lastBackupAt: -1, lastSafeAt: 5, lastError: 1 })).toEqual({
      enabled: true,
      folderName: "Backups",
      lastBackupAt: null,
      lastSafeAt: 5,
      lastError: "",
    });
  });
});

describe("backupHealth", () => {
  const now = 100 * 86_400_000;
  const on = { ...initialAutoBackup(), enabled: true, lastSafeAt: now - 1000, lastBackupAt: now - 1000 };

  it("is ok when writes are recent", () => {
    expect(backupHealth(on, "granted", now)).toEqual({ kind: "ok" });
  });

  it("is paused when the folder needs permission again", () => {
    expect(backupHealth(on, "prompt", now)).toEqual({ kind: "paused" });
  });

  it("reports the last error", () => {
    expect(backupHealth({ ...on, lastError: "Hết dung lượng" }, "granted", now)).toEqual({ kind: "error", message: "Hết dung lượng" });
  });

  it("is stale without a recent safe copy", () => {
    expect(backupHealth(initialAutoBackup(), "none", now)).toEqual({ kind: "stale", since: null });
    const old = { ...initialAutoBackup(), lastSafeAt: now - STALE_AFTER_MS - 1 };
    expect(backupHealth(old, "none", now).kind).toBe("stale");
  });
});

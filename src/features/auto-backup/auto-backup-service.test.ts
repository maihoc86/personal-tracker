import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAutoBackup } from "./auto-backup-model";
import { autoBackupActions, autoBackupStore, permissionStore, runBackup, type DirHandle } from "./auto-backup-service";

// Real directory handles are structured-cloneable; the fakes here hold
// functions, so keep IndexedDB as an in-memory map for these tests.
const idb = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  get: async (k: string) => idb.get(k),
  set: async (k: string, v: unknown) => void idb.set(k, v),
  del: async (k: string) => void idb.delete(k),
}));

vi.mock("../workspace/backup", async (orig) => ({
  ...(await orig<typeof import("../workspace/backup")>()),
  restoreBackup: vi.fn(),
}));

function fakeDir(permission: PermissionState = "granted", initial: string[] = []) {
  const files = new Map<string, string>(initial.map((n) => [n, "{}"]));
  const dir: DirHandle = {
    name: "Backups",
    queryPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => "granted" as PermissionState),
    getFileHandle: async (name) => ({
      createWritable: async () => {
        let buffer = "";
        return { write: async (d: string) => void (buffer += d), close: async () => void files.set(name, buffer) };
      },
    }),
    removeEntry: async (name) => void files.delete(name),
    keys: async function* () {
      yield* files.keys();
    },
  };
  return { dir, files };
}

beforeEach(async () => {
  idb.clear();
  window.localStorage.clear();
  autoBackupStore.set(initialAutoBackup());
  permissionStore.set("none");
});

describe("runBackup", () => {
  it("keeps a daily snapshot in the browser even without a folder", async () => {
    await runBackup(new Date(2026, 8, 28, 10));
    await runBackup(new Date(2026, 8, 28, 11));
    await runBackup(new Date(2026, 8, 29, 9));
    const list = await autoBackupActions.listSnapshots();
    expect(list.map((s) => s.day)).toEqual(["2026-09-29", "2026-09-28"]);
  });

  it("writes latest + dated files, prunes old ones and records success", async () => {
    const old = Array.from({ length: 16 }, (_, i) => `personal-tracker-2026-08-${String(i + 1).padStart(2, "0")}.json`);
    const { dir, files } = fakeDir("granted", old);
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn(async () => dir) as never;
    await autoBackupActions.chooseFolder();
    expect(autoBackupStore.get()).toMatchObject({ enabled: true, folderName: "Backups", lastError: "" });
    expect(files.has("personal-tracker-latest.json")).toBe(true);
    const dated = [...files.keys()].filter((n) => /\d{4}-\d{2}-\d{2}/.test(n));
    expect(dated).toHaveLength(14);
    expect(JSON.parse(files.get("personal-tracker-latest.json")!).app).toBe("personal-tracker");
  });

  it("pauses when permission must be granted again, and resumes on request", async () => {
    const { dir, files } = fakeDir("prompt");
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn(async () => dir) as never;
    await autoBackupActions.chooseFolder();
    expect(permissionStore.get()).toBe("prompt");
    expect(files.size).toBe(0);
    (dir.queryPermission as ReturnType<typeof vi.fn>).mockResolvedValue("granted");
    expect(await autoBackupActions.resume()).toBe(true);
    expect(files.has("personal-tracker-latest.json")).toBe(true);
  });

  it("records a friendly error when a write fails", async () => {
    const { dir } = fakeDir();
    dir.getFileHandle = async () => {
      throw new DOMException("gone", "NotFoundError");
    };
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn(async () => dir) as never;
    await autoBackupActions.chooseFolder();
    expect(autoBackupStore.get().lastError).toMatch(/chọn lại/);
  });

  it("ignores a cancelled picker and can be disabled", async () => {
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn(async () => {
      throw new DOMException("cancel", "AbortError");
    }) as never;
    expect(await autoBackupActions.chooseFolder()).toBe(false);
    await autoBackupActions.disable();
    expect(autoBackupStore.get().enabled).toBe(false);
  });
});

describe("safety snapshots", () => {
  it("keeps a pre-reset snapshot and restores browser snapshots", async () => {
    await runBackup(new Date(2026, 8, 28, 10));
    await autoBackupActions.snapshotBeforeReset();
    const list = await autoBackupActions.listSnapshots();
    expect(list.some((s) => s.day.includes("trước khi thay dữ liệu"))).toBe(true);
    expect(await autoBackupActions.restoreSnapshot(list[list.length - 1])).toBeNull();
    expect(await autoBackupActions.restoreSnapshot({ day: "x", at: 0, file: { nope: 1 } })).toMatch(/không phải/);
  });

  it("counts a manual export as a safe copy", () => {
    autoBackupActions.markExported();
    expect(autoBackupStore.get().lastSafeAt).toBeTypeOf("number");
  });
});

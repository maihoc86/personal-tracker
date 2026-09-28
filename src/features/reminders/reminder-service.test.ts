import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "../../lib/use-settings";
import { DEFAULT_SETTINGS } from "../../lib/settings";
import { taskActions, taskStore } from "../tasks/task-store";
import { checkReminders } from "./reminder-service";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));
vi.mock("../../lib/notify", () => ({ playChime: vi.fn() }));

beforeEach(() => {
  window.localStorage.clear();
  taskStore.set([]);
  settingsStore.set({ ...DEFAULT_SETTINGS, reminders: { enabled: true, leadMinutes: 15, digestTime: "" } });
  toast.mockClear();
});

describe("checkReminders", () => {
  it("fires a custom reminder once and lets it be snoozed", () => {
    const at = new Date(2026, 8, 28, 10, 0).getTime();
    const t = taskActions.add({ title: "Gọi khách", remindAt: at });
    checkReminders(at - 60_000);
    checkReminders(at + 1_000);
    checkReminders(at + 20_000);
    expect(toast).toHaveBeenCalledTimes(1);
    const [title, options] = toast.mock.calls[0];
    expect(title).toBe("Gọi khách");
    options.cancel.onClick();
    expect(taskStore.get().find((x) => x.id === t.id)!.remindAt).toBeGreaterThan(at);
  });
});

import { useEffect } from "react";
import { toast } from "sonner";
import { formatDayLabel, todayIso } from "../../lib/date";
import { playChime } from "../../lib/notify";
import { navigate, openTask } from "../../lib/router";
import { createPersistedStore } from "../../lib/store";
import { settingsStore } from "../../lib/use-settings";
import { taskActions, taskStore } from "../tasks/task-store";
import { collectReminders, digestText, remember, type Reminder } from "./reminder-model";

const CHECK_EVERY_MS = 30_000;
export const SNOOZE_MS = 10 * 60_000;

const firedStore = createPersistedStore<string[]>("pt.reminders-fired", [], {
  normalize: (raw) => (Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : []),
});
/** Last time reminders were checked, so reminders due while closed still fire on open. */
const checkedStore = createPersistedStore<number>("pt.reminders-checked", 0, {
  normalize: (raw) => (typeof raw === "number" ? raw : 0),
});

function systemNotify(title: string, body: string, onClick: () => void) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const n = new Notification(title, { body, tag: title });
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  } catch {
    // The in-app toast already shows the reminder.
  }
}

function deliver(r: Reminder) {
  if (r.kind === "digest") {
    const body = digestText(taskStore.get(), todayIso());
    const open = () => navigate({ name: "today" });
    toast("Bắt đầu ngày mới", { description: body, duration: 15_000, action: { label: "Xem Hôm nay", onClick: open } });
    systemNotify("Bắt đầu ngày mới", body, open);
    return;
  }
  const task = taskStore.get().find((t) => t.id === r.taskId);
  if (!task) return;
  const when = r.kind === "due" ? `Hạn ${formatDayLabel(task.dueDate)} lúc ${task.dueTime}` : "Nhắc việc";
  const open = () => openTask(task.id);
  toast(task.title, {
    description: when,
    duration: Infinity,
    action: { label: "Mở", onClick: open },
    cancel: {
      label: "Hoãn 10'",
      onClick: () => taskActions.patch(task.id, { remindAt: Date.now() + SNOOZE_MS }),
    },
  });
  systemNotify(task.title, when, open);
}

/** Run one check: fire what's due since the last check and remember it. */
export function checkReminders(now = Date.now()) {
  const settings = settingsStore.get().reminders;
  const from = checkedStore.get() || now - CHECK_EVERY_MS;
  const due = collectReminders(taskStore.get(), settings, from, now, new Set(firedStore.get()));
  checkedStore.set(now);
  if (!due.length) return;
  firedStore.set((prev) => remember(prev, due.map((r) => r.key)));
  playChime();
  due.forEach(deliver);
}

/** Mounted once by the app: checks on start, every 30s, and when the tab returns. */
export function useReminderTicker() {
  useEffect(() => {
    const first = window.setTimeout(() => checkReminders(), 2_000);
    const id = window.setInterval(() => checkReminders(), CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkReminders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

/** Show a sample reminder (Settings → "Thử nhắc"). */
export function testReminder() {
  playChime();
  toast("Nhắc việc đang hoạt động", { description: "Bạn sẽ thấy nhắc như thế này, kèm thông báo hệ thống nếu đã cho phép." });
  systemNotify("Nhắc việc đang hoạt động", "Personal Tracker sẽ nhắc bạn khi đến giờ.", () => {});
}

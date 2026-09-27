import { useEffect, useState } from "react";
import { DATA_KEYS } from "../../lib/data-keys";
import { ensureNotifyPermission, notify, playChime } from "../../lib/notify";
import { createPersistedStore, useStore } from "../../lib/store";
import { taskActions } from "../tasks/task-store";
import * as model from "./focus-model";

export const focusStore = createPersistedStore<model.FocusState>(
  DATA_KEYS.focus,
  model.initialFocus(),
  { normalize: model.migrateFocus },
);

export const focusActions = {
  toggle() {
    ensureNotifyPermission();
    const now = Date.now();
    focusStore.set((s) => (s.running ? model.pause(s, now) : model.start(s, now)));
  },
  /** Start a focus session on a task right away (from a task or the palette). */
  startOn(taskId: string) {
    ensureNotifyPermission();
    focusStore.set((s) => model.start({ ...model.switchPhase(s, "focus"), taskId }, Date.now()));
  },
  reset: () => focusStore.set(model.reset),
  skip: () => focusStore.set((s) => model.switchPhase(s, s.phase === "focus" ? "break" : "focus")),
  selectPreset: (id: string) => focusStore.set((s) => model.selectPreset(s, id)),
  setTask: (taskId: string) => focusStore.set((s) => ({ ...s, taskId })),
};

export function useFocus(): model.FocusState {
  return useStore(focusStore);
}

/** Re-render every `ms` while `active` — for countdown displays. */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}

/**
 * Mounted once by the app shell: finishes a phase when its time is up — even
 * if that happened while the tab was closed — logs focus minutes to the
 * linked task, and chimes + notifies.
 */
export function useFocusTicker() {
  const state = useFocus();
  const now = useNow(state.running);
  useEffect(() => {
    // Read the live value: a re-run with a stale closure (StrictMode, a second
    // tab) must not complete the same phase twice and double-log the time.
    const current = focusStore.get();
    if (!model.isDue(current, Date.now())) return;
    const { state: next, finished } = model.completePhase(current, Date.now());
    focusStore.set(next);
    if (finished?.taskId) taskActions.logTime(finished.taskId, finished.minutes, "focus");
    playChime();
    const preset = model.presetOf(current);
    if (finished) notify("Hết giờ tập trung", `Đã xong ${preset.focus} phút. Nghỉ ${preset.break} phút nhé.`);
    else notify("Hết giờ nghỉ", `Quay lại tập trung ${preset.focus} phút.`);
  }, [state, now]);
}

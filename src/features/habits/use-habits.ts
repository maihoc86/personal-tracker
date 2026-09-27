import { DATA_KEYS } from "../../lib/data-keys";
import { addDaysIso, isIsoDate, todayIso } from "../../lib/date";
import { createId } from "../../lib/id";
import { createPersistedStore, useStore } from "../../lib/store";

export type Habit = {
  id: string;
  name: string;
  /** ISO dates (yyyy-mm-dd) on which the habit was completed. */
  done: string[];
};

export function migrateHabits(raw: unknown): Habit[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((h) => {
    if (typeof h !== "object" || h === null) return [];
    const { id, name, done } = h as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string") return [];
    const days = Array.isArray(done) ? done.filter((d): d is string => typeof d === "string" && isIsoDate(d)) : [];
    return [{ id, name, done: [...new Set(days)] }];
  });
}

export const habitStore = createPersistedStore<Habit[]>(DATA_KEYS.habits, [], {
  normalize: migrateHabits,
});

export const habitActions = {
  add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    habitStore.set((prev) => [...prev, { id: createId(), name: clean, done: [] }]);
  },
  remove(id: string) {
    habitStore.set((prev) => prev.filter((h) => h.id !== id));
  },
  toggle(id: string, day = todayIso()) {
    habitStore.set((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, done: h.done.includes(day) ? h.done.filter((d) => d !== day) : [...h.done, day] }
          : h,
      ),
    );
  },
};

export function useHabits(): Habit[] {
  return useStore(habitStore);
}

/** Consecutive completed days ending today (or yesterday if today isn't done). */
export function currentStreak(done: string[], today = todayIso()): number {
  const set = new Set(done);
  let day = set.has(today) ? today : addDaysIso(today, -1);
  let streak = 0;
  while (set.has(day)) {
    streak++;
    day = addDaysIso(day, -1);
  }
  return streak;
}

/** The last `count` days (oldest → newest) with completion + today flags. */
export function recentDays(
  done: string[],
  count = 7,
  today = todayIso(),
): Array<{ iso: string; done: boolean; isToday: boolean }> {
  const set = new Set(done);
  return Array.from({ length: count }, (_, i) => {
    const iso = addDaysIso(today, i - (count - 1));
    return { iso, done: set.has(iso), isToday: iso === today };
  });
}

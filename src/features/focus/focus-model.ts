/** Pomodoro ("Focus") state as plain data, so it survives navigation and reloads. */

export type Phase = "focus" | "break";

export type Preset = { id: string; label: string; focus: number; break: number };

export const PRESETS: Preset[] = [
  { id: "classic", label: "25/5", focus: 25, break: 5 },
  { id: "deep", label: "50/10", focus: 50, break: 10 },
  { id: "sprint", label: "15/3", focus: 15, break: 3 },
];

export type FocusSession = { at: number; minutes: number; taskId: string };

export type FocusState = {
  presetId: string;
  phase: Phase;
  running: boolean;
  /** Epoch ms when the running phase ends (null while paused). */
  endsAt: number | null;
  /** Time left while paused. */
  remainingMs: number;
  /** Task the session is logged against, or "". */
  taskId: string;
  /** Completed focus phases, newest last (capped). */
  sessions: FocusSession[];
};

const MAX_SESSIONS = 1000;

export const presetOf = (s: FocusState): Preset =>
  PRESETS.find((p) => p.id === s.presetId) ?? PRESETS[0];

export const phaseMs = (s: FocusState, phase: Phase = s.phase): number =>
  (phase === "focus" ? presetOf(s).focus : presetOf(s).break) * 60_000;

export const initialFocus = (): FocusState => ({
  presetId: PRESETS[0].id,
  phase: "focus",
  running: false,
  endsAt: null,
  remainingMs: PRESETS[0].focus * 60_000,
  taskId: "",
  sessions: [],
});

export function remainingMs(s: FocusState, now: number): number {
  if (s.running && s.endsAt !== null) return Math.max(0, s.endsAt - now);
  return s.remainingMs;
}

/** 0 → 1 through the current phase. */
export function progress(s: FocusState, now: number): number {
  const total = phaseMs(s);
  return total ? 1 - remainingMs(s, now) / total : 0;
}

export function start(s: FocusState, now: number): FocusState {
  if (s.running) return s;
  return { ...s, running: true, endsAt: now + s.remainingMs };
}

export function pause(s: FocusState, now: number): FocusState {
  if (!s.running) return s;
  return { ...s, running: false, endsAt: null, remainingMs: remainingMs(s, now) };
}

export function reset(s: FocusState): FocusState {
  return { ...s, running: false, endsAt: null, remainingMs: phaseMs(s) };
}

export function switchPhase(s: FocusState, phase: Phase): FocusState {
  return { ...s, phase, running: false, endsAt: null, remainingMs: phaseMs(s, phase) };
}

export function selectPreset(s: FocusState, presetId: string): FocusState {
  const next = { ...s, presetId };
  return switchPhase(next, "focus");
}

/**
 * The running phase reached zero: record a finished focus session and flip
 * to the other phase, paused (so a break never starts without the person).
 */
export function completePhase(s: FocusState, now: number): { state: FocusState; finished?: FocusSession } {
  if (s.phase === "focus") {
    const finished: FocusSession = { at: now, minutes: presetOf(s).focus, taskId: s.taskId };
    const sessions = [...s.sessions, finished].slice(-MAX_SESSIONS);
    return { state: switchPhase({ ...s, sessions }, "break"), finished };
  }
  return { state: switchPhase(s, "focus") };
}

export function isDue(s: FocusState, now: number): boolean {
  return s.running && s.endsAt !== null && now >= s.endsAt;
}

type Loose = Record<string, unknown>;

export function migrateFocus(raw: unknown): FocusState {
  const base = initialFocus();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Loose;
  const state: FocusState = {
    presetId: PRESETS.some((p) => p.id === r.presetId) ? (r.presetId as string) : base.presetId,
    phase: r.phase === "break" ? "break" : "focus",
    running: r.running === true && typeof r.endsAt === "number",
    endsAt: typeof r.endsAt === "number" ? r.endsAt : null,
    remainingMs: typeof r.remainingMs === "number" && r.remainingMs >= 0 ? r.remainingMs : base.remainingMs,
    taskId: typeof r.taskId === "string" ? r.taskId : "",
    sessions: Array.isArray(r.sessions)
      ? r.sessions.flatMap((x) => {
          if (typeof x !== "object" || x === null) return [];
          const { at, minutes, taskId } = x as Loose;
          if (typeof at !== "number" || typeof minutes !== "number") return [];
          return [{ at, minutes, taskId: typeof taskId === "string" ? taskId : "" }];
        })
      : [],
  };
  if (!state.running) state.endsAt = null;
  return state;
}

/** 90_000 → "01:30" (rounds partial seconds up). */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

import { ChevronDown, Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "../components/shell/page-header";
import { Button } from "../components/ui/button";
import { IconButton } from "../components/ui/icon-button";
import { formatClock, PRESETS, presetOf, progress, remainingMs } from "../features/focus/focus-model";
import { focusActions, useFocus, useNow } from "../features/focus/focus-store";
import { HabitList } from "../features/habits/habit-list";
import { useProjects } from "../features/projects/project-store";
import { TaskSelect } from "../features/tasks/components/task-select";
import { projectMap, taskKey } from "../features/tasks/task-selectors";
import { useTasks } from "../features/tasks/task-store";
import { cn } from "../lib/cn";
import { addDaysIso, formatDayLabel, parseIso, toIsoDate, todayIso } from "../lib/date";
import { formatMinutes } from "../lib/duration";
import { openTask } from "../lib/router";

const R = 92;
const CIRC = 2 * Math.PI * R;

/** Pomodoro that logs to tasks, plus daily habits. */
export function FocusPage() {
  const state = useFocus();
  const now = useNow(state.running);
  const tasks = useTasks();
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const task = tasks.find((t) => t.id === state.taskId);
  const doing = useMemo(() => tasks.filter((t) => t.status === "doing"), [tasks]);
  const p = progress(state, now);
  const preset = presetOf(state);

  const today = todayIso();
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysIso(today, i - 6);
      const minutes = state.sessions
        .filter((s) => toIsoDate(new Date(s.at)) === iso)
        .reduce((sum, s) => sum + s.minutes, 0);
      return { iso, minutes };
    });
  }, [state.sessions, today]);
  const maxMinutes = Math.max(50, ...week.map((d) => d.minutes));
  const recent = [...state.sessions].reverse().slice(0, 8);

  return (
    <>
      <PageHeader title="Focus & thói quen" icon={<Timer size={16} className="text-ink-faint" />} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="flex flex-col items-center justify-center rounded-[14px] border border-line px-6 py-8">
            <div className="mb-6 flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
              {PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => focusActions.selectPreset(pr.id)}
                  className={cn(
                    "h-7 rounded-[6px] px-3 font-mono text-[12px]",
                    state.presetId === pr.id ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {pr.label}
                </button>
              ))}
            </div>

            <div className="relative grid place-items-center">
              <svg width="220" height="220" className="-rotate-90" aria-hidden>
                <circle cx="110" cy="110" r={R} fill="none" strokeWidth="6" className="stroke-surface-hover" />
                <circle
                  cx="110"
                  cy="110"
                  r={R}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - p)}
                  className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", state.phase === "focus" ? "stroke-accent" : "stroke-work")}
                />
              </svg>
              <div className="absolute text-center">
                <p className={cn("text-[12px] font-medium", state.phase === "focus" ? "text-accent-ink" : "text-work")}>
                  {state.phase === "focus" ? `Tập trung ${preset.focus} phút` : `Nghỉ ${preset.break} phút`}
                </p>
                <p className="font-mono text-[46px] font-medium leading-tight tabular-nums tracking-tight" aria-live="polite">
                  {formatClock(remainingMs(state, now))}
                </p>
              </div>
            </div>

            <TaskSelect value={state.taskId} onChange={focusActions.setTask} suggestions={doing}>
              <button type="button" className="mt-6 flex h-9 w-full max-w-sm items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 text-left text-[13px] hover:bg-surface-muted">
                {task ? (
                  <>
                    <span className="font-mono text-[11px] text-ink-faint">{taskKey(task, pm)}</span>
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  </>
                ) : (
                  <span className="flex-1 text-ink-faint">Chọn task đang làm — phiên xong sẽ tự log giờ</span>
                )}
                <ChevronDown size={14} className="shrink-0 text-ink-faint" />
              </button>
            </TaskSelect>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" onClick={focusActions.toggle} className="h-10 px-5">
                {state.running ? <Pause size={16} /> : <Play size={16} />}
                {state.running ? "Tạm dừng" : "Bắt đầu"}
              </Button>
              <IconButton variant="outline" aria-label="Bỏ qua phiên" onClick={focusActions.skip} className="h-10 w-10">
                <SkipForward size={16} />
              </IconButton>
              <IconButton variant="outline" aria-label="Đặt lại" onClick={focusActions.reset} className="h-10 w-10">
                <RotateCcw size={16} />
              </IconButton>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[14px] border border-line p-5">
              <h2 className="mb-4 text-[12px] font-semibold text-ink-soft">Phút tập trung 7 ngày qua</h2>
              <div className="flex h-28 items-end gap-2">
                {week.map((d) => (
                  <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[10.5px] tabular-nums text-ink-faint">{d.minutes || ""}</span>
                    <div
                      className={cn("w-full max-w-[28px] rounded-t-[4px]", d.iso === today ? "bg-accent" : "bg-accent/35")}
                      style={{ height: `${Math.max(2, (d.minutes / maxMinutes) * 72)}px` }}
                      title={`${formatDayLabel(d.iso, today)}: ${formatMinutes(d.minutes)}`}
                    />
                    <span className="text-[10.5px] text-ink-faint">{["CN", "T2", "T3", "T4", "T5", "T6", "T7"][parseIso(d.iso).getDay()]}</span>
                  </div>
                ))}
              </div>
              {recent.length ? (
                <ul className="mt-5 space-y-px border-t border-line pt-3">
                  {recent.map((s) => {
                    const t = tasks.find((x) => x.id === s.taskId);
                    return (
                      <li key={s.at} className="flex h-7 items-center gap-2 text-[12.5px]">
                        <span className="w-[118px] shrink-0 whitespace-nowrap font-mono text-[11px] text-ink-faint">
                          {formatDayLabel(toIsoDate(new Date(s.at)), today)} {new Date(s.at).toTimeString().slice(0, 5)}
                        </span>
                        <span className="w-10 shrink-0 font-mono text-[11px] text-ink-soft">{s.minutes}m</span>
                        {t ? (
                          <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                            {t.title}
                          </button>
                        ) : (
                          <span className="text-ink-faint">Không gắn task</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>

            <section className="rounded-[14px] border border-line p-5">
              <h2 className="mb-2 text-[12px] font-semibold text-ink-soft">Thói quen · 14 ngày</h2>
              <HabitList />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

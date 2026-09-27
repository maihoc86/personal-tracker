import { ChevronDown, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useMemo } from "react";
import { IconButton } from "../../components/ui/icon-button";
import { cn } from "../../lib/cn";
import { parseIso, todayIso } from "../../lib/date";
import { formatMinutes } from "../../lib/duration";
import { useProjects } from "../projects/project-store";
import { TaskSelect } from "../tasks/components/task-select";
import { projectMap, taskKey } from "../tasks/task-selectors";
import { useTasks } from "../tasks/task-store";
import type { Task } from "../tasks/task-types";
import { formatClock, PRESETS, presetOf, progress, remainingMs } from "./focus-model";
import { focusActions, useFocus, useNow } from "./focus-store";

/** Compact Focus card for the Today rail. */
export function FocusWidget({ suggestions }: { suggestions: Task[] }) {
  const state = useFocus();
  const now = useNow(state.running);
  const tasks = useTasks();
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const task = tasks.find((t) => t.id === state.taskId);
  const startOfToday = parseIso(todayIso()).getTime();
  const todayMinutes = state.sessions.filter((s) => s.at >= startOfToday).reduce((sum, s) => sum + s.minutes, 0);
  const pct = progress(state, now) * 100;

  return (
    <div className="rounded-[12px] border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-ink-soft">Focus</h3>
        <div className="flex rounded-[6px] bg-surface-muted p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => focusActions.selectPreset(p.id)}
              title={`Tập trung ${p.focus} phút, nghỉ ${p.break} phút`}
              className={cn(
                "h-5 rounded-[4px] px-1.5 font-mono text-[10.5px]",
                state.presetId === p.id ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-faint hover:text-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[34px] font-medium leading-none tabular-nums tracking-tight">{formatClock(remainingMs(state, now))}</span>
        <span className={cn("text-[12px] font-medium", state.phase === "focus" ? "text-accent-ink" : "text-work")}>
          {state.phase === "focus" ? "Tập trung" : "Nghỉ"}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-hover">
        <div className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", state.phase === "focus" ? "bg-accent" : "bg-work")} style={{ width: `${pct}%` }} />
      </div>

      <TaskSelect value={state.taskId} onChange={focusActions.setTask} suggestions={suggestions}>
        <button type="button" className="mt-3 flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] border border-line px-2.5 text-left text-[12.5px] hover:bg-surface-muted">
          {task ? (
            <>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(task, pm)}</span>
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
            </>
          ) : (
            <span className="flex-1 text-ink-faint">Gắn task để tự log thời gian</span>
          )}
          <ChevronDown size={13} className="shrink-0 text-ink-faint" />
        </button>
      </TaskSelect>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={focusActions.toggle}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-btn text-[13px] font-medium text-btn-ink hover:opacity-90"
        >
          {state.running ? <Pause size={14} /> : <Play size={14} />}
          {state.running ? "Tạm dừng" : "Bắt đầu"}
        </button>
        <IconButton variant="outline" aria-label="Bỏ qua phiên" onClick={focusActions.skip}>
          <SkipForward size={14} />
        </IconButton>
        <IconButton variant="outline" aria-label="Đặt lại" onClick={focusActions.reset}>
          <RotateCcw size={14} />
        </IconButton>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-faint">
        Hôm nay: <span className="font-mono text-ink-soft">{formatMinutes(todayMinutes)}</span> tập trung ·{" "}
        {presetOf(state).focus}/{presetOf(state).break} phút
      </p>
    </div>
  );
}

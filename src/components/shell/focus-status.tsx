import { Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { focusActions, useFocus, useNow } from "../../features/focus/focus-store";
import { formatClock, phaseMs, presetOf, progress, remainingMs } from "../../features/focus/focus-model";
import { useProjects } from "../../features/projects/project-store";
import { projectMap, taskKey } from "../../features/tasks/task-selectors";
import { useTasks } from "../../features/tasks/task-store";
import { cn } from "../../lib/cn";
import { navigate } from "../../lib/router";

/**
 * The "focus fuse": a hairline across the top of the window that burns down
 * while a session runs — visible from every page, gone when idle.
 */
export function FocusFuse() {
  const state = useFocus();
  const now = useNow(state.running);
  if (!state.running) return null;
  const left = 1 - progress(state, now);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className={cn(
          "h-full origin-left transition-transform duration-1000 ease-linear",
          state.phase === "focus" ? "bg-accent" : "bg-work",
        )}
        style={{ transform: `scaleX(${left})` }}
      />
    </div>
  );
}

/** Sidebar footer: the running/paused session and the task it logs to. */
export function FocusStatus() {
  const state = useFocus();
  const now = useNow(state.running);
  const tasks = useTasks();
  const projects = useProjects();
  const task = useMemo(() => tasks.find((t) => t.id === state.taskId), [tasks, state.taskId]);
  const pm = useMemo(() => projectMap(projects), [projects]);

  const left = remainingMs(state, now);
  const idle = !state.running && left === phaseMs(state) && !task;
  if (idle) return null;

  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-2">
      <button
        type="button"
        onClick={() => navigate({ name: "focus" })}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[15px] font-medium tabular-nums text-ink">{formatClock(left)}</span>
          <span className={cn("text-[11px] font-medium", state.phase === "focus" ? "text-accent-ink" : "text-work")}>
            {state.phase === "focus" ? `Tập trung ${presetOf(state).focus}'` : "Nghỉ"}
          </span>
        </span>
        <span className="block truncate text-[11.5px] text-ink-faint">
          {task ? `${taskKey(task, pm)} · ${task.title}` : "Chưa gắn task"}
        </span>
      </button>
      <button
        type="button"
        onClick={focusActions.toggle}
        aria-label={state.running ? "Tạm dừng" : "Tiếp tục"}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-btn text-btn-ink transition-opacity hover:opacity-90"
      >
        {state.running ? <Pause size={13} /> : <Play size={13} className="translate-x-px" />}
      </button>
    </div>
  );
}

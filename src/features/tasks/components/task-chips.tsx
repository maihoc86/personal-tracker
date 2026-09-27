import { CalendarClock, Link2, ListChecks, Repeat, Timer } from "lucide-react";
import { cn } from "../../../lib/cn";
import { dueState, formatDayLabel, todayIso } from "../../../lib/date";
import { formatHours, formatMinutes } from "../../../lib/duration";
import { describeRecurrence } from "../recurrence";
import { checklistProgress, loggedMinutes } from "../task-selectors";
import type { Task } from "../task-types";

/** Mono "WEB-12" key. */
export function TaskKeyLabel({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("shrink-0 font-mono text-[11px] tabular-nums tracking-tight text-ink-faint", className)}>
      {value}
    </span>
  );
}

const chip = "inline-flex h-5 items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-medium leading-none";

/** Due date with urgency colour: red overdue, amber today. */
export function DueChip({ task, className }: { task: Task; className?: string }) {
  if (!task.dueDate) return null;
  const today = todayIso();
  const state = task.status === "done" ? "done" : dueState(task.dueDate, today);
  return (
    <span
      className={cn(
        chip,
        "border border-line",
        state === "overdue" && "border-transparent bg-danger-soft text-danger",
        state === "today" && "border-transparent bg-warn/12 text-warn",
        (state === "soon" || state === "upcoming") && "text-ink-soft",
        state === "done" && "text-ink-faint",
        className,
      )}
    >
      <CalendarClock size={11} />
      {formatDayLabel(task.dueDate, today)}
      {task.dueTime ? ` · ${task.dueTime}` : ""}
    </span>
  );
}

export function ChecklistChip({ task }: { task: Task }) {
  const { done, total } = checklistProgress(task);
  if (!total) return null;
  return (
    <span className={cn(chip, "tabular-nums", done === total ? "text-accent-ink" : "text-ink-soft")}>
      <ListChecks size={12} />
      {done}/{total}
    </span>
  );
}

/** Logged vs estimated time ("1h 30m / 3h"), turning red when over. */
export function TimeChip({ task }: { task: Task }) {
  const logged = loggedMinutes(task);
  const est = task.estimatedHours;
  if (!logged && !est) return null;
  const over = est !== undefined && logged > est * 60;
  return (
    <span className={cn(chip, "font-mono tabular-nums", over ? "text-danger" : "text-ink-soft")}>
      <Timer size={11} />
      {logged ? formatMinutes(logged) : null}
      {logged && est ? <span className="text-ink-faint">/</span> : null}
      {est ? formatHours(est) : null}
    </span>
  );
}

export function RecurrenceChip({ task }: { task: Task }) {
  if (!task.recurrence) return null;
  return (
    <span className={cn(chip, "text-ink-soft")} title={describeRecurrence(task.recurrence)}>
      <Repeat size={11} />
    </span>
  );
}

export function BlockedChip({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className={cn(chip, "bg-danger-soft text-danger")} title="Đang bị chặn bởi task chưa xong">
      <Link2 size={11} />
      Bị chặn
    </span>
  );
}

export function TagChip({ tag }: { tag: string }) {
  return (
    <span className={cn(chip, "border border-line text-ink-soft")}>
      <span className="text-ink-faint">#</span>
      {tag}
    </span>
  );
}

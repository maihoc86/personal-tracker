import { cn } from "../../../lib/cn";
import { openTask } from "../../../lib/router";
import type { Project } from "../../projects/project-types";
import { toggleDone } from "../task-commands";
import type { Task } from "../task-types";
import { BlockedChip, DueChip, RecurrenceChip, TaskKeyLabel, TimeChip } from "./task-chips";
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./task-icons";

type TaskRowProps = {
  task: Task;
  keyLabel: string;
  project?: Project;
  blocked?: number;
  /** Hide the due chip when the section already says when (e.g. "Hôm nay"). */
  hideDue?: boolean;
};

/** A to-do style row: tick to complete, click to open. */
export function TaskRow({ task, keyLabel, project, blocked = 0, hideDue }: TaskRowProps) {
  const done = task.status === "done";
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") openTask(task.id);
      }}
      className="group flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 outline-none transition-colors hover:bg-surface-muted/70 focus-visible:bg-accent-soft"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDone(task, keyLabel);
        }}
        aria-label={done ? `Mở lại ${task.title}` : `Hoàn thành ${task.title}`}
        className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full"
      >
        <StatusIcon status={task.status} size={17} className="transition-opacity group-hover:opacity-0" />
        <StatusIcon status="done" size={17} className={cn("absolute opacity-0 transition-opacity", !done && "group-hover:opacity-35", done && "group-hover:opacity-100")} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13.5px]", done ? "text-ink-faint line-through decoration-ink-faint/50" : "text-ink")}>{task.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          <TaskKeyLabel value={keyLabel} className="text-[10.5px]" />
          <ProjectSwatch color={project?.color} size={7} />
          <span className="truncate">{project?.name ?? "Inbox"}</span>
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1 sm:flex">
        <BlockedChip count={blocked} />
        <RecurrenceChip task={task} />
        <TimeChip task={task} />
      </span>
      {!hideDue ? <DueChip task={task} className="shrink-0" /> : task.dueTime ? <span className="shrink-0 font-mono text-[11.5px] text-ink-soft">{task.dueTime}</span> : null}
      <PriorityIcon priority={task.priority} className={cn("shrink-0", task.priority === "low" && "opacity-0")} />
    </div>
  );
}

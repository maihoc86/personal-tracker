import { cn } from "../../../lib/cn";
import type { Project } from "../../projects/project-types";
import type { Task } from "../task-types";
import { PriorityIcon, ProjectSwatch } from "./task-icons";
import { BlockedChip, ChecklistChip, DueChip, RecurrenceChip, TagChip, TaskKeyLabel, TimeChip } from "./task-chips";

type TaskCardProps = {
  task: Task;
  taskKeyLabel: string;
  project?: Project;
  /** Show the project line (cross-project views). */
  showProject?: boolean;
  blockedCount?: number;
  /** Custom stage name shown on cross-project boards. */
  stageLabel?: string;
  className?: string;
};

/** Board card: key + priority, title, then only the chips that carry information. */
export function TaskCardBody({ task, taskKeyLabel, project, showProject, blockedCount = 0, stageLabel, className }: TaskCardProps) {
  const done = task.status === "done";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <TaskKeyLabel value={taskKeyLabel} />
        {stageLabel ? (
          <span className="truncate rounded-[4px] bg-surface-muted px-1.5 text-[10.5px] font-medium text-ink-soft">{stageLabel}</span>
        ) : null}
        {task.priority !== "low" || !done ? (
          <PriorityIcon priority={task.priority} size={13} className="ml-auto" />
        ) : null}
      </div>
      <p className={cn("line-clamp-3 text-[13px] font-medium leading-snug", done ? "text-ink-soft" : "text-ink")}>
        {task.title}
      </p>
      {!done ? (
        <div className="flex flex-wrap items-center gap-1 empty:hidden">
          <BlockedChip count={blockedCount} />
          <DueChip task={task} />
          <ChecklistChip task={task} />
          <TimeChip task={task} />
          <RecurrenceChip task={task} />
          {task.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
          {task.tags.length > 2 ? <span className="text-[11px] text-ink-faint">+{task.tags.length - 2}</span> : null}
        </div>
      ) : null}
      {showProject ? (
        <div className="flex items-center gap-1.5 pt-0.5 text-[11.5px] text-ink-faint">
          <ProjectSwatch color={project?.color} size={8} />
          <span className="truncate">{project?.name ?? "Inbox"}</span>
        </div>
      ) : null}
    </div>
  );
}

import { ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { IconButton } from "../../../components/ui/icon-button";
import { cn } from "../../../lib/cn";
import { todayIso } from "../../../lib/date";
import { openTask } from "../../../lib/router";
import type { Project } from "../../projects/project-types";
import { BlockedChip, ChecklistChip, DueChip, RecurrenceChip, TagChip, TaskKeyLabel, TimeChip } from "../components/task-chips";
import { PriorityIcon, ProjectSwatch, StatusIcon } from "../components/task-icons";
import { PriorityMenu } from "../components/task-pickers";
import { StageMenu } from "../../workflow/stage-menu";
import { useStageResolver } from "../../workflow/use-stages";
import type { Stage } from "../../workflow/workflow-model";
import { groupByStages, groupTasks, openBlockers, taskKey, type GroupBy, type ProjectMap, type TaskGroup } from "../task-selectors";
import { taskActions } from "../task-store";
import type { Task, TaskDraft, TaskStatus } from "../task-types";

type ListViewProps = {
  tasks: Task[];
  allTasks: Task[];
  groupBy: GroupBy;
  projects: Project[];
  projectMap: ProjectMap;
  showProject: boolean;
  /** Set when the page has a single workflow: status groups become its stages. */
  stages?: Stage[];
  onAdd: (prefill: Partial<TaskDraft>) => void;
};

/** Dense grouped rows (Linear-style) with inline status/priority changes. */
export function ListView({ tasks, allTasks, groupBy, projects, projectMap, showProject, stages, onAdd }: ListViewProps) {
  const today = todayIso();
  const byStage = groupBy === "status" && !!stages;
  const groups = useMemo(
    () => (byStage ? groupByStages(tasks, stages!) : groupTasks(tasks, groupBy, { today, projects })),
    [tasks, groupBy, today, projects, stages, byStage],
  );
  const stageMap = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);
  const allById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);

  return (
    <div className="h-full overflow-y-auto pb-10">
      {groups.map((g) => (
        <Group
          key={g.id}
          group={g}
          groupBy={groupBy}
          stage={byStage ? stageMap.get(g.id) : undefined}
          onAdd={() => onAdd(byStage ? { stageId: g.id } : prefillFor(groupBy, g))}
          renderRow={(t) => (
            <Row
              key={t.id}
              task={t}
              keyLabel={taskKey(t, projectMap)}
              project={projectMap.get(t.projectId)}
              showProject={showProject && groupBy !== "project"}
              blocked={openBlockers(t, allById).length}
            />
          )}
        />
      ))}
    </div>
  );
}

function prefillFor(groupBy: GroupBy, g: TaskGroup): Partial<TaskDraft> {
  if (groupBy === "status") return { status: g.id as TaskStatus };
  if (groupBy === "project") return { projectId: g.id };
  if (groupBy === "priority") return { priority: g.id as Task["priority"] };
  return {};
}

function Group({
  group,
  groupBy,
  stage,
  onAdd,
  renderRow,
}: {
  group: TaskGroup;
  groupBy: GroupBy;
  stage?: Stage;
  onAdd: () => void;
  renderRow: (t: Task) => React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const hideHeader = groupBy === "none";
  return (
    <section>
      {hideHeader ? null : (
        <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-line bg-surface-sunken/95 px-2 backdrop-blur sm:px-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-w-0 items-center gap-2 rounded-[6px] px-1 py-1 text-[13px] font-semibold text-ink hover:bg-surface-hover"
          >
            <ChevronRight size={13} className={cn("shrink-0 text-ink-faint transition-transform", open && "rotate-90")} />
            {stage ? <StatusIcon status={stage.category} color={stage.color} /> : <GroupMarker groupBy={groupBy} group={group} />}
            <span className="truncate">{group.label}</span>
          </button>
          <span className="font-mono text-[11px] tabular-nums text-ink-faint">{group.tasks.length}</span>
          <IconButton size="sm" aria-label={`Thêm task vào ${group.label}`} onClick={onAdd} className="ml-auto">
            <Plus size={14} />
          </IconButton>
        </div>
      )}
      {open ? (
        group.tasks.length ? (
          <div role="list">{group.tasks.map(renderRow)}</div>
        ) : (
          <p className="border-b border-line/60 px-4 py-2.5 text-[12.5px] text-ink-faint sm:pl-10">Không có task.</p>
        )
      ) : null}
    </section>
  );
}

function GroupMarker({ groupBy, group }: { groupBy: GroupBy; group: TaskGroup }) {
  if (groupBy === "status") return <StatusIcon status={group.id as TaskStatus} />;
  if (groupBy === "priority") return <PriorityIcon priority={group.id as Task["priority"]} />;
  if (groupBy === "project") return <ProjectSwatch color={group.color} />;
  return null;
}

function Row({
  task,
  keyLabel,
  project,
  showProject,
  blocked,
}: {
  task: Task;
  keyLabel: string;
  project?: Project;
  showProject: boolean;
  blocked: number;
}) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const { stagesOf, stageOf } = useStageResolver();
  const stage = stageOf(task);
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") openTask(task.id);
      }}
      className="group flex h-10 cursor-pointer items-center gap-2 border-b border-line/60 px-2 outline-none transition-colors hover:bg-surface-muted/60 focus-visible:bg-accent-soft sm:gap-2.5 sm:px-4"
    >
      <PriorityMenu value={task.priority} onChange={(priority) => taskActions.patch(task.id, { priority })}>
        <button type="button" onClick={stop} aria-label="Đổi ưu tiên" className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] hover:bg-surface-hover">
          <PriorityIcon priority={task.priority} />
        </button>
      </PriorityMenu>
      <TaskKeyLabel value={keyLabel} className="hidden w-[64px] sm:block" />
      <StageMenu stages={stagesOf(task)} value={stage.id} onChange={(stageId) => taskActions.setStage(task.id, stageId)}>
        <button type="button" onClick={stop} aria-label={`Stage: ${stage.name}`} title={stage.name} className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] hover:bg-surface-hover">
          <StatusIcon status={task.status} color={stage.color} />
        </button>
      </StageMenu>
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", task.status === "done" ? "text-ink-faint line-through decoration-ink-faint/50" : "text-ink")}>
        {task.title}
      </span>
      <span className="hidden shrink-0 items-center gap-1 lg:flex">
        {task.tags.slice(0, 2).map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </span>
      <span className="hidden shrink-0 items-center gap-1 md:flex">
        <BlockedChip count={blocked} />
        <RecurrenceChip task={task} />
        <ChecklistChip task={task} />
      </span>
      {showProject ? (
        <span className="hidden w-[130px] shrink-0 items-center gap-1.5 truncate text-[12px] text-ink-faint xl:flex">
          <ProjectSwatch color={project?.color} size={8} />
          <span className="truncate">{project?.name ?? "Inbox"}</span>
        </span>
      ) : null}
      <span className="hidden shrink-0 md:block">
        <TimeChip task={task} />
      </span>
      <DueChip task={task} className="shrink-0" />
    </div>
  );
}

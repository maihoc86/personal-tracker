import { CalendarClock, CalendarRange, Clock, Inbox, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { DatePicker } from "../../../components/ui/date-picker";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../../components/ui/menu";
import { cn } from "../../../lib/cn";
import { dueState, formatDayLabel, formatRelativeTime } from "../../../lib/date";
import type { Project } from "../../projects/project-types";
import { PriorityIcon, ProjectSwatch, StatusIcon } from "../components/task-icons";
import { PriorityMenu, ProjectMenu } from "../components/task-pickers";
import { StageMenu } from "../../workflow/stage-menu";
import { useStagesFor } from "../../workflow/use-stages";
import { resolveStage } from "../../workflow/workflow-model";
import { describeRecurrence } from "../recurrence";
import { collectTags, type ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import { PRIORITY_META, type Recurrence, type Task } from "../task-types";
import { BlockersField } from "./blockers-field";
import { Placeholder, PropertyRow } from "./property-row";
import { propButton } from "./property-styles";
import { TagInput } from "./tag-input";
import { TimeLogField } from "./time-log-field";

const RECURRENCE_OPTIONS: { label: string; value: Recurrence | undefined }[] = [
  { label: "Không lặp lại", value: undefined },
  { label: "Hằng ngày", value: { freq: "daily", interval: 1 } },
  { label: "Ngày làm việc (T2–T6)", value: { freq: "weekdays", interval: 1 } },
  { label: "Hằng tuần", value: { freq: "weekly", interval: 1 } },
  { label: "Mỗi 2 tuần", value: { freq: "weekly", interval: 2 } },
  { label: "Hằng tháng", value: { freq: "monthly", interval: 1 } },
];

type TaskPropertiesProps = {
  task: Task;
  allTasks: Task[];
  projects: Project[];
  projectMap: ProjectMap;
};

/** Right-hand property rail of the task panel; every change saves at once. */
export function TaskProperties({ task, allTasks, projects, projectMap }: TaskPropertiesProps) {
  const patch = (p: Parameters<typeof taskActions.patch>[1]) => taskActions.patch(task.id, p);
  const project = projectMap.get(task.projectId);
  const due = task.status === "done" ? "none" : dueState(task.dueDate);
  const stages = useStagesFor(task.projectId);
  const stage = resolveStage(task, stages);

  return (
    <div className="space-y-0.5">
      <PropertyRow label="Stage">
        <StageMenu stages={stages} value={stage.id} onChange={(stageId) => taskActions.setStage(task.id, stageId)}>
          <button type="button" className={propButton}>
            <StatusIcon status={task.status} color={stage.color} />
            {stage.name}
          </button>
        </StageMenu>
      </PropertyRow>

      <PropertyRow label="Ưu tiên">
        <PriorityMenu value={task.priority} onChange={(priority) => patch({ priority })}>
          <button type="button" className={propButton}>
            <PriorityIcon priority={task.priority} />
            {PRIORITY_META[task.priority].label}
          </button>
        </PriorityMenu>
      </PropertyRow>

      <PropertyRow label="Dự án">
        <ProjectMenu value={task.projectId} onChange={(projectId) => patch({ projectId })} projects={projects}>
          <button type="button" className={propButton}>
            {project ? <ProjectSwatch color={project.color} /> : <Inbox size={14} className="text-ink-faint" />}
            <span className="truncate">{project?.name ?? "Inbox"}</span>
          </button>
        </ProjectMenu>
      </PropertyRow>

      <PropertyRow label="Bắt đầu">
        <DatePicker value={task.startDate} onChange={(startDate) => patch({ startDate })}>
          <button type="button" className={propButton}>
            <CalendarRange size={14} className="shrink-0 text-ink-faint" />
            {task.startDate ? formatDayLabel(task.startDate) : <Placeholder>Chưa đặt</Placeholder>}
          </button>
        </DatePicker>
      </PropertyRow>

      <PropertyRow label="Hạn chót">
        <DatePicker value={task.dueDate} onChange={(dueDate) => patch({ dueDate, dueTime: dueDate ? task.dueTime : "" })}>
          <button type="button" className={cn(propButton, due === "overdue" && "text-danger", due === "today" && "text-warn")}>
            <CalendarClock size={14} className="shrink-0 opacity-70" />
            {task.dueDate ? formatDayLabel(task.dueDate) : <Placeholder>Chưa đặt</Placeholder>}
          </button>
        </DatePicker>
      </PropertyRow>

      {task.dueDate ? (
        <PropertyRow label="Giờ">
          <label className={cn(propButton, "cursor-text")}>
            <Clock size={14} className="shrink-0 text-ink-faint" />
            <input
              type="time"
              value={task.dueTime}
              onChange={(e) => patch({ dueTime: e.target.value })}
              aria-label="Giờ hạn chót"
              className={cn("min-w-0 flex-1 bg-transparent font-mono text-[12.5px] outline-none", !task.dueTime && "text-ink-faint")}
            />
          </label>
        </PropertyRow>
      ) : null}

      <PropertyRow label="Ước lượng">
        <EstimateInput value={task.estimatedHours} onChange={(estimatedHours) => patch({ estimatedHours })} />
      </PropertyRow>

      <PropertyRow label="Đã làm">
        <TimeLogField task={task} />
      </PropertyRow>

      <PropertyRow label="Lặp lại">
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className={propButton}>
              <Repeat size={14} className="shrink-0 text-ink-faint" />
              {task.recurrence ? describeRecurrence(task.recurrence) : <Placeholder>Không lặp lại</Placeholder>}
            </button>
          </MenuTrigger>
          <MenuContent align="start">
            {RECURRENCE_OPTIONS.map((o) => (
              <MenuItem
                key={o.label}
                selected={JSON.stringify(o.value) === JSON.stringify(task.recurrence)}
                onSelect={() => patch({ recurrence: o.value })}
              >
                {o.label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
        {task.recurrence ? (
          <p className="px-2 pb-1 text-[11.5px] leading-snug text-ink-faint">
            Khi hoàn thành, task mới sẽ được tạo cho lần tiếp theo.
          </p>
        ) : null}
      </PropertyRow>

      <PropertyRow label="Bị chặn bởi">
        <BlockersField task={task} allTasks={allTasks} projects={projectMap} />
      </PropertyRow>

      <PropertyRow label="Tag">
        <TagInput tags={task.tags} onChange={(tags) => patch({ tags })} suggestions={collectTags(allTasks)} />
      </PropertyRow>

      <div className="space-y-0.5 border-t border-line pt-3 text-[11.5px] text-ink-faint">
        <p>Tạo {formatRelativeTime(task.createdAt)}</p>
        <p>Cập nhật {formatRelativeTime(task.updatedAt)}</p>
      </div>
    </div>
  );
}

/** Hours input that commits on blur/Enter, so typing "1." doesn't save NaN. */
function EstimateInput({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  useEffect(() => setDraft(value?.toString() ?? ""), [value]);
  const commit = () => {
    const n = Number(draft.replace(",", "."));
    const next = draft.trim() === "" || !(n > 0) ? undefined : Math.round(n * 4) / 4;
    if (next !== value) onChange(next);
    setDraft(next?.toString() ?? "");
  };
  return (
    <label className={cn(propButton, "cursor-text")}>
      <input
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Số giờ"
        aria-label="Ước lượng (giờ)"
        style={{ width: draft ? `${draft.length + 1}ch` : "4.5rem" }}
        className="bg-transparent font-mono text-[12.5px] tabular-nums outline-none placeholder:font-sans placeholder:text-ink-faint"
      />
      {draft ? <span className="text-[12px] text-ink-faint">giờ</span> : null}
    </label>
  );
}

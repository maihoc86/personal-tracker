import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { IconButton } from "../../../components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { cn } from "../../../lib/cn";
import { addDaysIso, formatFullDate, isWeekend, startOfWeekIso, toIsoDate, todayIso } from "../../../lib/date";
import { openTask } from "../../../lib/router";
import { StatusIcon } from "../components/task-icons";
import { taskKey, type ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import type { Task } from "../task-types";

type CalendarViewProps = {
  tasks: Task[];
  projects: ProjectMap;
  onCreateOn: (dateIso: string) => void;
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MAX_PILLS = 3;
const DRAG_TYPE = "application/x-pt-task";

/** Month grid: tasks sit on their due date; drag a pill to another day to reschedule. */
export function CalendarView({ tasks, projects, onCreateOn }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const today = todayIso();

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    }
    for (const list of map.values()) list.sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.dueTime.localeCompare(b.dueTime));
    return map;
  }, [tasks]);

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor]);
  const undated = tasks.filter((t) => !t.dueDate && t.status !== "done").length;

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  function drop(e: React.DragEvent, iso: string) {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData(DRAG_TYPE);
    if (id) taskActions.patch(id, { dueDate: iso });
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-2.5 sm:p-3">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <h2 className="font-display text-[17px] font-semibold tracking-tight">
          Tháng {cursor.month + 1}
          <span className="ml-1.5 font-mono text-[13px] font-normal text-ink-faint">{cursor.year}</span>
        </h2>
        {undated ? <span className="ml-2 hidden text-[12px] text-ink-faint sm:inline">{undated} task chưa có hạn không hiện ở đây</span> : null}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={goToday}>
            Hôm nay
          </Button>
          <IconButton aria-label="Tháng trước" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton aria-label="Tháng sau" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line pb-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 text-[11px] font-medium text-ink-faint">
            {d}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-[minmax(96px,1fr)] grid-cols-7 overflow-y-auto">
        {cells.map((cell) => {
          const dayTasks = byDate.get(cell.iso) ?? [];
          const hidden = dayTasks.length - MAX_PILLS;
          return (
            <div
              key={cell.iso}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                setDropTarget(cell.iso);
              }}
              onDragLeave={() => setDropTarget((d) => (d === cell.iso ? null : d))}
              onDrop={(e) => drop(e, cell.iso)}
              className={cn(
                "group relative flex min-h-0 flex-col gap-1 overflow-hidden border-b border-r border-line/70 p-1.5 [&:nth-child(7n)]:border-r-0",
                !cell.inMonth && "bg-surface-sunken/60",
                isWeekend(cell.iso) && cell.inMonth && "bg-surface-muted/30",
                dropTarget === cell.iso && "bg-accent-soft",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-full px-1 font-mono text-[11.5px] tabular-nums",
                    cell.iso === today ? "bg-accent-strong font-medium text-white" : cell.inMonth ? "text-ink-soft" : "text-ink-faint/70",
                  )}
                >
                  {cell.day}
                </span>
                <button
                  type="button"
                  onClick={() => onCreateOn(cell.iso)}
                  aria-label={`Thêm task ngày ${formatFullDate(cell.iso)}`}
                  className="grid h-5 w-5 place-items-center rounded-[4px] text-ink-faint opacity-0 transition hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex min-h-0 flex-col gap-0.5">
                {dayTasks.slice(0, MAX_PILLS).map((t) => (
                  <Pill key={t.id} task={t} color={projects.get(t.projectId)?.color} />
                ))}
                {hidden > 0 ? (
                  <DayOverflow iso={cell.iso} tasks={dayTasks} projects={projects} count={hidden} onCreate={() => onCreateOn(cell.iso)} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ task, color }: { task: Task; color?: string }) {
  const done = task.status === "done";
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => openTask(task.id)}
      title={task.title}
      className={cn(
        "flex h-[22px] w-full items-center gap-1.5 truncate rounded-[5px] border-l-[3px] bg-surface px-1.5 text-left text-[11.5px] font-medium shadow-[0_0_0_1px_var(--color-line)] transition-colors hover:bg-surface-hover",
        done ? "text-ink-faint line-through" : "text-ink",
      )}
      style={{ borderLeftColor: color ?? "var(--color-line-strong)" }}
    >
      {task.dueTime ? <span className="font-mono text-[10.5px] text-ink-faint">{task.dueTime}</span> : null}
      <span className="truncate">{task.title}</span>
    </button>
  );
}

function DayOverflow({
  iso,
  tasks,
  projects,
  count,
  onCreate,
}: {
  iso: string;
  tasks: Task[];
  projects: ProjectMap;
  count: number;
  onCreate: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-[4px] px-1 text-left text-[11px] font-medium text-ink-faint hover:bg-surface-hover hover:text-ink">
          +{count} task
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-[12px] font-semibold text-ink">{formatFullDate(iso)}</p>
        <div className="max-h-72 space-y-px overflow-y-auto">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTask(t.id)}
              className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[12.5px] hover:bg-surface-hover"
            >
              <StatusIcon status={t.status} size={13} />
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(t, projects)}</span>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={onCreate} className="mt-1 w-full justify-start">
          <Plus size={13} />
          Thêm task ngày này
        </Button>
      </PopoverContent>
    </Popover>
  );
}

type Cell = { iso: string; day: number; inMonth: boolean };

/** Monday-first grid covering exactly the weeks the month spans. */
function buildMonthCells(year: number, month: number): Cell[] {
  const first = toIsoDate(new Date(year, month, 1));
  const start = startOfWeekIso(first);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const iso = addDaysIso(start, i);
    const d = new Date(iso + "T00:00:00");
    return { iso, day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

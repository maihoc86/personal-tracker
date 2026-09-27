import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { IconButton } from "../../../components/ui/icon-button";
import { cn } from "../../../lib/cn";
import { addDaysIso, diffDays, isWeekend, parseIso, startOfWeekIso, todayIso } from "../../../lib/date";
import { useLocalStorage } from "../../../lib/use-local-storage";
import { openTask } from "../../../lib/router";
import type { Project } from "../../projects/project-types";
import { StatusIcon } from "../components/task-icons";
import { taskKey, type ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import { applyDrag, spanColumns, taskSpan, type DragMode } from "../timeline-model";
import type { Task } from "../task-types";

type Zoom = "week" | "month";
const ZOOM = {
  week: { days: 42, width: 40, step: 7 },
  month: { days: 98, width: 16, step: 28 },
} as const;
const ROW = 36;
const LEFT = 248;

type TimelineViewProps = {
  tasks: Task[];
  projects: Project[];
  projectMap: ProjectMap;
  /** Group rows by project (cross-project scopes). */
  groupByProject: boolean;
};

type Drag = { id: string; mode: DragMode; startX: number; delta: number; moved: boolean };

/** Gantt-lite: bars from start to due; drag to move, drag an edge to resize. */
export function TimelineView({ tasks, projects, projectMap, groupByProject }: TimelineViewProps) {
  const today = todayIso();
  const [zoom, setZoom] = useLocalStorage<Zoom>("pt.timeline-zoom", "week");
  const [offset, setOffset] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const { days, width, step } = ZOOM[zoom];
  const windowStart = addDaysIso(startOfWeekIso(today), -7 + offset * step);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDaysIso(windowStart, i)), [windowStart, days]);

  const dated = useMemo(
    () =>
      tasks
        .filter((t) => taskSpan(t))
        .sort((a, b) => taskSpan(a)!.start.localeCompare(taskSpan(b)!.start)),
    [tasks],
  );
  const undated = tasks.length - dated.length;

  const rows = useMemo(() => {
    if (!groupByProject) return dated.map((t) => ({ kind: "task" as const, task: t }));
    const order = [...projects.map((p) => p.id), ""];
    const out: ({ kind: "group"; id: string } | { kind: "task"; task: Task })[] = [];
    for (const pid of order) {
      const list = dated.filter((t) => (projectMap.has(t.projectId) ? t.projectId : "") === pid);
      if (!list.length) continue;
      out.push({ kind: "group", id: pid });
      out.push(...list.map((task) => ({ kind: "task" as const, task })));
    }
    return out;
  }, [dated, groupByProject, projects, projectMap]);

  function begin(e: React.PointerEvent, task: Task, mode: DragMode) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d = { id: task.id, mode, startX: e.clientX, delta: 0, moved: false };
    dragRef.current = d;
    setDrag(d);
  }
  function move(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const next = { ...d, delta: Math.round(dx / width), moved: d.moved || Math.abs(dx) > 3 };
    dragRef.current = next;
    setDrag(next);
  }
  function end(task: Task) {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    if (!d.moved) {
      openTask(task.id);
      return;
    }
    const patch = applyDrag(task, d.mode, d.delta);
    if (patch) taskActions.patch(task.id, patch);
  }

  const todayCol = diffDays(windowStart, today);
  const gridWidth = days * width;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 py-2 sm:px-4">
        <Button size="sm" variant="ghost" onClick={() => setOffset(0)}>
          Hôm nay
        </Button>
        <IconButton aria-label="Lùi" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft size={16} />
        </IconButton>
        <IconButton aria-label="Tới" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight size={16} />
        </IconButton>
        <div className="ml-1 flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
          {(["week", "month"] as Zoom[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={cn(
                "h-6 rounded-[5px] px-2 text-[12px] font-medium",
                zoom === z ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft",
              )}
            >
              {z === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-ink-faint">
          {undated ? `${undated} task chưa có ngày · ` : ""}Kéo thanh để dời, kéo mép để đổi ngày
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-line">
        <div className="relative" style={{ width: LEFT + gridWidth, minHeight: "100%" }}>
          {/* Header: months + days */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
            <div className="sticky left-0 z-10 flex shrink-0 items-end border-r border-line bg-surface px-4 pb-1.5 text-[11.5px] font-medium text-ink-faint" style={{ width: LEFT }}>
              Task
            </div>
            <div style={{ width: gridWidth }}>
              <MonthRow days={dayList} width={width} />
              <div className="flex h-6">
                {dayList.map((iso) => (
                  <div
                    key={iso}
                    className={cn(
                      "shrink-0 text-center font-mono text-[10.5px] leading-6 tabular-nums",
                      iso === today ? "font-semibold text-accent-ink" : isWeekend(iso) ? "text-ink-faint/60" : "text-ink-faint",
                    )}
                    style={{ width }}
                  >
                    {zoom === "week" || parseIso(iso).getDay() === 1 ? parseIso(iso).getDate() : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 flex" style={{ left: LEFT, width: gridWidth }}>
              {dayList.map((iso) => (
                <div key={iso} className={cn("h-full shrink-0 border-r border-line/40", isWeekend(iso) && "bg-surface-muted/50")} style={{ width }} />
              ))}
              {todayCol >= 0 && todayCol < days ? (
                <div className="absolute inset-y-0 w-px bg-accent" style={{ left: todayCol * width + width / 2 }} />
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="sticky left-0 px-4 py-10 text-[13px] text-ink-faint" style={{ width: LEFT + 360 }}>
                Chưa có task nào có ngày bắt đầu hoặc hạn chót. Đặt ngày trong chi tiết task để thấy chúng ở đây.
              </p>
            ) : null}

            {rows.map((row) =>
              row.kind === "group" ? (
                <GroupRow key={`g-${row.id}`} project={projectMap.get(row.id)} />
              ) : (
                <div key={row.task.id} className="relative flex border-b border-line/50" style={{ height: ROW }}>
                  <button
                    type="button"
                    onClick={() => openTask(row.task.id)}
                    className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-surface px-4 text-left hover:bg-surface-muted"
                    style={{ width: LEFT }}
                  >
                    <StatusIcon status={row.task.status} size={13} />
                    <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(row.task, projectMap)}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{row.task.title}</span>
                  </button>
                  <Bar
                    task={row.task}
                    color={projectMap.get(row.task.projectId)?.color}
                    windowStart={windowStart}
                    days={days}
                    width={width}
                    drag={drag?.id === row.task.id ? drag : null}
                    onBegin={begin}
                    onMove={move}
                    onEnd={end}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthRow({ days, width }: { days: string[]; width: number }) {
  const spans: { label: string; count: number }[] = [];
  for (const iso of days) {
    const d = parseIso(iso);
    const label = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    const last = spans[spans.length - 1];
    if (last?.label === label) last.count++;
    else spans.push({ label, count: 1 });
  }
  return (
    <div className="flex h-6 border-b border-line/60">
      {spans.map((s) => (
        <div key={s.label} className="shrink-0 truncate border-r border-line/60 px-2 text-[11.5px] font-semibold leading-6 text-ink-soft" style={{ width: s.count * width }}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

function GroupRow({ project }: { project?: Project }) {
  return (
    <div className="relative flex h-8 items-center border-b border-line bg-surface-sunken">
      <div className="sticky left-0 flex items-center gap-2 px-4 text-[12px] font-semibold text-ink-soft">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: project?.color ?? "var(--color-line-strong)" }} />
        {project?.name ?? "Inbox"}
      </div>
    </div>
  );
}

function Bar({
  task,
  color,
  windowStart,
  days,
  width,
  drag,
  onBegin,
  onMove,
  onEnd,
}: {
  task: Task;
  color?: string;
  windowStart: string;
  days: number;
  width: number;
  drag: Drag | null;
  onBegin: (e: React.PointerEvent, task: Task, mode: DragMode) => void;
  onMove: (e: React.PointerEvent) => void;
  onEnd: (task: Task) => void;
}) {
  const preview = drag && drag.moved ? applyDrag(task, drag.mode, drag.delta) : null;
  const span = preview ? { start: preview.startDate, end: preview.dueDate } : taskSpan(task);
  const cols = span ? spanColumns(span, windowStart, days) : null;
  if (!cols) return null;
  const hue = color ?? "var(--color-ink-faint)";
  const barWidth = (cols.to - cols.from + 1) * width - 4;
  const narrow = barWidth < 96;
  const handlers = { onPointerMove: onMove, onPointerUp: () => onEnd(task), onPointerCancel: () => onEnd(task) };

  return (
    <div className="absolute inset-y-0" style={{ left: LEFT + cols.from * width + 2, width: barWidth }}>
      <div
        role="button"
        tabIndex={-1}
        aria-label={`${task.title}: kéo để dời ngày`}
        onPointerDown={(e) => onBegin(e, task, "move")}
        {...handlers}
        className={cn(
          "group absolute inset-x-0 top-[7px] flex h-[22px] cursor-grab touch-none select-none items-center overflow-hidden rounded-[6px] border px-2 text-[11.5px] font-medium text-ink active:cursor-grabbing",
          task.status === "done" && "opacity-55",
          drag?.moved && "shadow-[var(--shadow-float)]",
          cols.clippedStart && "rounded-l-none",
          cols.clippedEnd && "rounded-r-none",
        )}
        style={{
          backgroundColor: `color-mix(in srgb, ${hue} 26%, var(--color-surface))`,
          borderColor: `color-mix(in srgb, ${hue} 60%, transparent)`,
        }}
      >
        {!narrow ? <span className="truncate">{task.title}</span> : null}
        <span onPointerDown={(e) => onBegin(e, task, "resize-start")} {...handlers} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize" />
        <span onPointerDown={(e) => onBegin(e, task, "resize-end")} {...handlers} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
      </div>
      {narrow ? (
        <span className="pointer-events-none absolute left-full top-[9px] ml-2 whitespace-nowrap text-[11.5px] text-ink-soft">{task.title}</span>
      ) : null}
    </div>
  );
}

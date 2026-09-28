import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Settings2 } from "lucide-react";
import { IconButton } from "../../../components/ui/icon-button";
import { cn } from "../../../lib/cn";
import { formatHours } from "../../../lib/duration";
import { openTask } from "../../../lib/router";
import { mergeVisibleOrder } from "../board-order";
import { TaskCardBody } from "../components/task-card";
import { StatusIcon } from "../components/task-icons";
import { openBlockers, openEstimate, taskKey, type ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import type { Task, TaskStatus } from "../task-types";

const DAY_MS = 86_400_000;

/** A board column: a custom stage, or a category in cross-project views. */
export type BoardColumn = {
  id: string;
  label: string;
  category: TaskStatus;
  color?: string;
  wipLimit?: number;
};

type BoardViewProps = {
  /** Columns in order; `mode` says whether they are stages or categories. */
  columns: BoardColumn[];
  mode: "stage" | "category";
  /** Which column a task sits in. */
  columnOf: (t: Task) => string;
  /** Extra label on a card (its stage when columns are categories). */
  cardLabel?: (t: Task) => string | undefined;
  /** Opens the stage editor (single-workflow boards). */
  onEditStages?: () => void;
  /** Visible tasks (scoped + filtered), already in display order. */
  tasks: Task[];
  /** Every task, so a reorder can be merged back without losing hidden ones. */
  allTasks: Task[];
  projects: ProjectMap;
  showProject: boolean;
  /** Drag-to-reorder is only meaningful in manual order. */
  sortable: boolean;
  /** Auto-fold done tasks older than this many days (0 = never). */
  archiveDays: number;
  onAdd: (column: BoardColumn) => void;
};

type Columns = Record<string, string[]>;

function layout(columns: BoardColumn[], tasks: Task[], columnOf: (t: Task) => string): Columns {
  const out: Columns = Object.fromEntries(columns.map((c) => [c.id, [] as string[]]));
  for (const t of tasks) out[columnOf(t)]?.push(t.id);
  return out;
}

/**
 * Four-column board with sortable drag-and-drop (dnd-kit): cards reorder
 * within a column and move across columns; siblings shift live during a drag,
 * then the new order + status is merged into the full list and saved.
 */
export function BoardView({
  columns: columnDefs,
  mode,
  columnOf,
  cardLabel,
  onEditStages,
  tasks,
  allTasks,
  projects,
  showProject,
  sortable,
  archiveDays,
  onAdd,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Columns>(() => layout(columnDefs, tasks, columnOf));
  const columnIds = useMemo(() => columnDefs.map((c) => c.id), [columnDefs]);
  const defs = useMemo(() => new Map(columnDefs.map((c) => [c.id, c])), [columnDefs]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const allById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);

  // Re-sync from props when not mid-drag (add/edit/delete elsewhere).
  useEffect(() => {
    if (!activeId) setColumns(layout(columnDefs, tasks, columnOf));
  }, [tasks, activeId, columnDefs, columnOf]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    // Space picks a card up/drops it; Enter stays free to open the task.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  function findColumn(id: string): string | null {
    if (defs.has(id)) return id;
    return columnIds.find((c) => columns[c]?.includes(id)) ?? null;
  }

  /** A task placed in `column`: stage boards set the stage, category boards the status. */
  function place(t: Task, column: BoardColumn): Task {
    if (mode === "stage") {
      return t.stageId === column.id && t.status === column.category ? t : { ...t, stageId: column.id, status: column.category };
    }
    return t.status === column.category ? t : { ...t, status: column.category };
  }

  function persist(next: Columns) {
    const flat: Task[] = [];
    for (const column of columnDefs) {
      for (const id of next[column.id] ?? []) {
        const t = taskMap.get(id);
        if (t) flat.push(place(t, column));
      }
    }
    taskActions.reorder(mergeVisibleOrder(allTasks, flat));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const overItems = prev[to];
      const overIndex = overItems.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== active.id),
        [to]: [...overItems.slice(0, insertAt), String(active.id), ...overItems.slice(insertAt)],
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to) return;
    let next = columns;
    if (from === to && sortable) {
      const items = columns[from];
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (newIndex !== -1 && oldIndex !== newIndex) {
        next = { ...columns, [from]: arrayMove(items, oldIndex, newIndex) };
        setColumns(next);
      }
    }
    persist(next);
  }

  const activeTask = activeId ? taskMap.get(activeId) : null;
  const cardProps = (t: Task) => ({
    task: t,
    taskKeyLabel: taskKey(t, projects),
    project: projects.get(t.projectId),
    showProject,
    blockedCount: openBlockers(t, allById).length,
    stageLabel: cardLabel?.(t),
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full min-h-0 gap-2.5 overflow-x-auto p-2.5 sm:p-3">
        {columnDefs.map((column) => (
          <Column
            key={column.id}
            column={column}
            ids={columns[column.id] ?? []}
            taskMap={taskMap}
            archiveDays={archiveDays}
            onAdd={onAdd}
            renderCard={(t) => <TaskCardBody {...cardProps(t)} />}
          />
        ))}
        {onEditStages ? (
          <button
            type="button"
            onClick={onEditStages}
            className="flex w-10 shrink-0 flex-col items-center gap-2 rounded-[12px] border border-dashed border-line-strong pt-3 text-[12px] text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink-soft"
            title="Tuỳ chỉnh stage"
            aria-label="Tuỳ chỉnh stage của dự án"
          >
            <Settings2 size={15} />
            <span className="[writing-mode:vertical-rl]">Tuỳ chỉnh stage</span>
          </button>
        ) : null}
      </div>
      <DragOverlay dropAnimation={{ duration: 160 }}>
        {activeTask ? (
          <div className="w-[272px] cursor-grabbing rounded-[10px] border border-line-strong bg-surface p-2.5 shadow-[var(--shadow-float)]">
            <TaskCardBody {...cardProps(activeTask)} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type ColumnProps = {
  column: BoardColumn;
  ids: string[];
  taskMap: Map<string, Task>;
  archiveDays: number;
  onAdd: (column: BoardColumn) => void;
  renderCard: (t: Task) => React.ReactNode;
};

function Column({ column, ids, taskMap, archiveDays, onAdd, renderCard }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showArchived, setShowArchived] = useState(false);

  // In Done, fold away tasks completed long ago so the board stays light.
  const now = Date.now();
  const archivedIds =
    column.category === "done" && archiveDays > 0
      ? ids.filter((id) => {
          const t = taskMap.get(id);
          return !!t?.doneAt && now - t.doneAt > archiveDays * DAY_MS;
        })
      : [];
  const visibleIds = archivedIds.length && !showArchived ? ids.filter((id) => !archivedIds.includes(id)) : ids;
  const columnTasks = ids.map((id) => taskMap.get(id)).filter((t): t is Task => !!t);
  const estimate = openEstimate(columnTasks);
  const count = ids.length - archivedIds.length;
  const overLimit = !!column.wipLimit && count > column.wipLimit;

  return (
    <section
      ref={setNodeRef}
      aria-label={column.label}
      className={cn(
        "flex min-h-0 w-[272px] shrink-0 flex-col rounded-[12px] bg-surface-muted/70 transition-colors lg:w-auto lg:min-w-[220px] lg:flex-1",
        overLimit && "bg-danger-soft",
        isOver && "bg-accent-soft",
      )}
    >
      <header className="group flex h-10 shrink-0 items-center gap-2 px-3">
        <StatusIcon status={column.category} color={column.color} />
        <h3 className="truncate text-[13px] font-semibold text-ink">{column.label}</h3>
        <span
          className={cn("font-mono text-[11px] tabular-nums", overLimit ? "font-semibold text-danger" : "text-ink-faint")}
          title={column.wipLimit ? `Giới hạn WIP: ${column.wipLimit}` : undefined}
        >
          {count}
          {column.wipLimit ? `/${column.wipLimit}` : ""}
        </span>
        {estimate > 0 ? (
          <span className="font-mono text-[11px] tabular-nums text-ink-faint" title="Tổng ước lượng còn lại">
            · {formatHours(estimate)}
          </span>
        ) : null}
        <IconButton size="sm" aria-label={`Thêm task vào ${column.label}`} onClick={() => onAdd(column)} className="ml-auto">
          <Plus size={14} />
        </IconButton>
      </header>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[60px] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
          {visibleIds.map((id) => {
            const task = taskMap.get(id);
            return task ? <SortableCard key={id} task={task}>{renderCard(task)}</SortableCard> : null;
          })}
          {archivedIds.length ? (
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="rounded-[6px] px-2 py-1.5 text-left text-[11.5px] font-medium text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-soft"
            >
              {showArchived ? "Ẩn task cũ" : `+ ${archivedIds.length} task xong hơn ${archiveDays} ngày`}
            </button>
          ) : null}
          {visibleIds.length === 0 && !archivedIds.length ? (
            <button
              type="button"
              onClick={() => onAdd(column)}
              className="grid min-h-[64px] place-items-center rounded-[10px] border border-dashed border-line-strong text-[12px] text-ink-faint transition-colors hover:bg-surface hover:text-ink-soft"
            >
              Kéo task vào đây hoặc bấm để thêm
            </button>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ task, children }: { task: Task; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") openTask(task.id);
      }}
      aria-label={task.title}
      className={cn(
        "cursor-grab rounded-[10px] border border-line bg-surface p-2.5 text-left outline-none transition-[border-color,box-shadow]",
        "hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/40 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </div>
  );
}

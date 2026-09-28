import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { IconButton } from "../../components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { cn } from "../../lib/cn";
import { createId } from "../../lib/id";
import { PROJECT_COLORS } from "../projects/project-types";
import { StatusIcon } from "../tasks/components/task-icons";
import { TASK_STATUSES, type TaskStatus } from "../tasks/task-types";
import { CATEGORY_LABELS, type Stage } from "./workflow-model";

type StageEditorProps = {
  stages: Stage[];
  onChange: (stages: Stage[]) => void;
  /** Open tasks per stage id, shown so deleting a busy stage is a conscious choice. */
  counts: Map<string, number>;
};

/** Sortable list of stages: name, category, colour and WIP limit per row. */
export function StageEditor({ stages, onChange, counts }: StageEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const update = (id: string, patch: Partial<Stage>) => onChange(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = stages.findIndex((s) => s.id === e.active.id);
    const to = stages.findIndex((s) => s.id === e.over!.id);
    onChange(arrayMove(stages, from, to));
  }

  function add() {
    const doneIndex = stages.findIndex((s) => s.category === "done");
    const stage: Stage = { id: createId(), name: `Stage ${stages.length + 1}`, category: "doing" };
    const next = [...stages];
    next.splice(doneIndex < 0 ? next.length : doneIndex, 0, stage);
    onChange(next);
  }

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[20px_28px_minmax(0,1fr)_180px_64px_36px_28px] items-center gap-2 px-1 text-[11px] font-medium text-ink-faint max-sm:hidden">
        <span />
        <span />
        <span>Tên stage</span>
        <span>Nhóm</span>
        <span title="Giới hạn số task cùng lúc (Kanban WIP)">WIP</span>
        <span className="text-right">Task</span>
        <span />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {stages.map((s) => (
              <StageRow
                key={s.id}
                stage={s}
                count={counts.get(s.id) ?? 0}
                onChange={(patch) => update(s.id, patch)}
                onRemove={() => onChange(stages.filter((x) => x.id !== s.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button size="sm" variant="ghost" onClick={add} className="mt-2">
        <Plus size={14} />
        Thêm stage
      </Button>
    </div>
  );
}

function StageRow({
  stage,
  count,
  onChange,
  onRemove,
}: {
  stage: Stage;
  count: number;
  onChange: (patch: Partial<Stage>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[20px_28px_minmax(0,1fr)_180px_64px_36px_28px] items-center gap-2 rounded-[8px] border border-line bg-surface px-1 py-1 max-sm:grid-cols-[20px_28px_minmax(0,1fr)_28px]",
        isDragging && "relative z-10 shadow-[var(--shadow-float)]",
      )}
    >
      <button type="button" {...attributes} {...listeners} aria-label={`Kéo để đổi thứ tự ${stage.name}`} className="grid h-7 cursor-grab place-items-center text-ink-faint hover:text-ink active:cursor-grabbing">
        <GripVertical size={14} />
      </button>
      <ColorPicker stage={stage} onChange={(color) => onChange({ color })} />
      <input
        value={stage.name}
        onChange={(e) => onChange({ name: e.target.value.slice(0, 40) })}
        aria-label="Tên stage"
        className="h-8 min-w-0 rounded-[6px] bg-transparent px-2 text-[13px] font-medium text-ink outline-none hover:bg-surface-muted focus:bg-surface-muted"
      />
      <div className="max-sm:hidden">
        <Select value={stage.category} onValueChange={(v) => onChange({ category: v as TaskStatus, wipLimit: v === "done" ? undefined : stage.wipLimit })}>
          <SelectTrigger className="h-8 whitespace-nowrap border-transparent px-2 hover:border-line" aria-label="Nhóm của stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="flex items-center gap-2">
                  <StatusIcon status={c} size={13} />
                  {CATEGORY_LABELS[c]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <input
        inputMode="numeric"
        value={stage.wipLimit ?? ""}
        disabled={stage.category === "done"}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          onChange({ wipLimit: n > 0 ? Math.min(n, 999) : undefined });
        }}
        placeholder="—"
        aria-label="Giới hạn WIP"
        className="h-8 w-full rounded-[6px] bg-transparent px-2 font-mono text-[12.5px] outline-none placeholder:text-ink-faint hover:bg-surface-muted focus:bg-surface-muted disabled:opacity-40 max-sm:hidden"
      />
      <span className="text-right font-mono text-[11.5px] tabular-nums text-ink-faint max-sm:hidden">{count}</span>
      <IconButton size="sm" aria-label={`Xoá stage ${stage.name}`} onClick={onRemove} className="hover:text-danger">
        <Trash2 size={13} />
      </IconButton>
    </li>
  );
}

function ColorPicker({ stage, onChange }: { stage: Stage; onChange: (color: string | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Màu của ${stage.name}`} className="grid h-7 w-7 place-items-center rounded-[6px] hover:bg-surface-muted">
          <StatusIcon status={stage.category} color={stage.color} size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Màu theo nhóm"
            className={cn("grid h-6 w-6 place-items-center rounded-full border border-line text-ink-faint", !stage.color && "ring-2 ring-ink/60 ring-offset-1 ring-offset-surface")}
          >
            <StatusIcon status={stage.category} size={12} />
          </button>
          {PROJECT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.name}
              onClick={() => onChange(c.value)}
              className={cn("grid h-6 w-6 place-items-center rounded-full text-white", stage.color === c.value && "ring-2 ring-ink/60 ring-offset-1 ring-offset-surface")}
              style={{ backgroundColor: c.value }}
            >
              {stage.color === c.value ? <Check size={11} /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { SectionLabel } from "../../../components/ui/form-controls";
import { cn } from "../../../lib/cn";
import { createId } from "../../../lib/id";
import { isSubmitEnter } from "../../../lib/keyboard";
import type { ChecklistItem } from "../task-types";

type TaskChecklistProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

/** Subtask checklist: tick / rename / delete inline, add with Enter. */
export function TaskChecklist({ items, onChange }: TaskChecklistProps) {
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;
  const total = items.length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: createId(), text, done: false }]);
    setDraft("");
  }

  const toggle = (id: string) => onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const setText = (id: string, text: string) => onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <div>
      <SectionLabel
        action={
          total ? (
            <span className="flex items-center gap-2">
              <span className="h-1 w-20 overflow-hidden rounded-full bg-surface-hover">
                <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
              </span>
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                {done}/{total}
              </span>
            </span>
          ) : null
        }
      >
        Việc cần làm
      </SectionLabel>

      <div className="space-y-px">
        {items.map((item) => (
          <div key={item.id} className="group flex h-8 items-center gap-2 rounded-[6px] px-1 transition-colors hover:bg-surface-muted">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-label={item.done ? "Bỏ đánh dấu" : "Đánh dấu xong"}
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors",
                item.done ? "border-transparent bg-accent-strong text-white" : "border-line-strong text-transparent hover:border-ink-faint",
              )}
            >
              <Check size={11} strokeWidth={3} />
            </button>
            <input
              value={item.text}
              onChange={(e) => setText(item.id, e.target.value)}
              aria-label="Nội dung việc"
              className={cn("min-w-0 flex-1 bg-transparent text-[13px] outline-none", item.done ? "text-ink-faint line-through" : "text-ink")}
            />
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="Xoá việc"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-ink-faint opacity-0 transition hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-1 flex h-8 items-center gap-2 px-1">
        <Plus size={14} className="shrink-0 text-ink-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (isSubmitEnter(e)) {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="Thêm việc cần làm rồi nhấn Enter"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
    </div>
  );
}

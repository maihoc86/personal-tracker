import { Bell, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { cn } from "../../lib/cn";
import { formatDayLabel, parseIso, toIsoDate } from "../../lib/date";
import { propButton } from "../tasks/detail/property-styles";
import { Placeholder } from "../tasks/detail/property-row";
import { taskActions } from "../tasks/task-store";
import type { Task } from "../tasks/task-types";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "Hôm nay · 14:00", "T3, 29 Th9 · 09:00" */
export const formatReminder = (ms: number) => `${formatDayLabel(toIsoDate(new Date(ms)))} · ${clock(ms)}`;

function presets(task: Task, now: number): { label: string; at: number }[] {
  const at = (iso: string, h: number, m = 0) => {
    const d = parseIso(iso);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const today = toIsoDate(new Date(now));
  const tomorrow = toIsoDate(new Date(now + 86_400_000));
  const list = [
    { label: "Sau 1 giờ", at: now + 3_600_000 },
    { label: "Chiều nay 14:00", at: at(today, 14) },
    { label: "Tối nay 20:00", at: at(today, 20) },
    { label: "Sáng mai 09:00", at: at(tomorrow, 9) },
  ];
  if (task.dueDate && task.dueTime) {
    const [h, m] = task.dueTime.split(":").map(Number);
    list.push({ label: "1 giờ trước hạn", at: at(task.dueDate, h, m) - 3_600_000 });
  } else if (task.dueDate) {
    list.push({ label: "9:00 ngày hạn", at: at(task.dueDate, 9) });
  }
  return list.filter((p) => p.at > now);
}

/** Pick a custom reminder time for one task. */
export function ReminderField({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const set = (remindAt: number | undefined) => {
    taskActions.patch(task.id, { remindAt });
    setOpen(false);
  };
  const past = task.remindAt !== undefined && task.remindAt <= now;
  const toLocalInput = (ms: number) => `${toIsoDate(new Date(ms))}T${clock(ms)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(propButton, past && "text-ink-faint line-through")}>
          <Bell size={14} className="shrink-0 text-ink-faint" />
          {task.remindAt ? formatReminder(task.remindAt) : <Placeholder>Không nhắc</Placeholder>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        {presets(task, now).map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => set(p.at)}
            className="flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-left text-[12.5px] hover:bg-surface-hover"
          >
            {p.label}
            <span className="font-mono text-[11px] text-ink-faint">{formatReminder(p.at)}</span>
          </button>
        ))}
        <label className="mt-1 block border-t border-line px-2 pt-2 text-[11.5px] text-ink-faint">
          Chọn giờ khác
          <input
            type="datetime-local"
            defaultValue={task.remindAt ? toLocalInput(task.remindAt) : ""}
            onChange={(e) => {
              const ms = e.target.value ? new Date(e.target.value).getTime() : NaN;
              if (!Number.isNaN(ms)) taskActions.patch(task.id, { remindAt: ms });
            }}
            className="mt-1 h-8 w-full rounded-[6px] border border-line bg-surface px-2 font-mono text-[12px] text-ink outline-none focus:border-line-strong"
          />
        </label>
        {task.remindAt ? (
          <button
            type="button"
            onClick={() => set(undefined)}
            className="mt-1 flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[12.5px] text-ink-faint hover:bg-surface-hover hover:text-ink"
          >
            <X size={12} />
            Bỏ nhắc
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

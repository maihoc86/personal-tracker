import { Check, Flame, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { formatShortDate, todayIso } from "../../lib/date";
import { currentStreak, habitActions, recentDays, useHabits, type Habit } from "./use-habits";

/** Habit checklist for today; `compact` for the Today rail, full with a 14-day strip. */
export function HabitList({ compact }: { compact?: boolean }) {
  const habits = useHabits();
  const [draft, setDraft] = useState("");

  return (
    <div>
      {habits.length === 0 ? (
        <p className="py-2 text-[12.5px] text-ink-faint">Chưa có thói quen nào. Thêm một thói quen bên dưới để bắt đầu theo dõi.</p>
      ) : (
        <ul className="space-y-px">
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} days={compact ? 7 : 14} />
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          habitActions.add(draft);
          setDraft("");
        }}
        className="mt-1 flex h-8 items-center gap-2 px-1"
      >
        <Plus size={14} className="shrink-0 text-ink-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Thêm thói quen rồi nhấn Enter"
          aria-label="Thêm thói quen"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
        />
      </form>
    </div>
  );
}

function HabitRow({ habit, days }: { habit: Habit; days: number }) {
  const today = todayIso();
  const doneToday = habit.done.includes(today);
  const streak = currentStreak(habit.done, today);
  return (
    <li className="group flex h-9 items-center gap-2.5 rounded-[7px] px-1 hover:bg-surface-muted/70">
      <button
        type="button"
        onClick={() => habitActions.toggle(habit.id)}
        aria-label={doneToday ? `Bỏ đánh dấu ${habit.name} hôm nay` : `Đánh dấu ${habit.name} hôm nay`}
        aria-pressed={doneToday}
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
          doneToday ? "border-transparent bg-accent-strong text-white" : "border-line-strong text-transparent hover:border-ink-faint",
        )}
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", doneToday ? "text-ink-soft" : "text-ink")}>{habit.name}</span>
      <span className="flex shrink-0 items-center gap-[3px]" aria-label={`${days} ngày gần nhất`}>
        {recentDays(habit.done, days, today).map((d) => (
          <button
            key={d.iso}
            type="button"
            title={formatShortDate(d.iso)}
            aria-label={`${d.done ? "Bỏ" : "Đánh"} dấu ngày ${formatShortDate(d.iso)}`}
            onClick={() => habitActions.toggle(habit.id, d.iso)}
            className={cn("h-3.5 w-[5px] rounded-full transition-colors", d.done ? "bg-accent" : "bg-surface-hover hover:bg-line-strong", d.isToday && "w-[7px]")}
          />
        ))}
      </span>
      <span className={cn("flex w-9 shrink-0 items-center justify-end gap-0.5 font-mono text-[11px] tabular-nums", streak ? "text-warn" : "text-ink-faint/50")}>
        <Flame size={11} />
        {streak}
      </span>
      <button
        type="button"
        onClick={() => habitActions.remove(habit.id)}
        aria-label={`Xoá thói quen ${habit.name}`}
        className="grid h-6 w-0 shrink-0 place-items-center overflow-hidden rounded-[5px] text-ink-faint opacity-0 transition-all hover:bg-surface-hover hover:text-ink focus-visible:w-6 focus-visible:opacity-100 group-hover:w-6 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </li>
  );
}

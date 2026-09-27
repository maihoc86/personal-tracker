import { CalendarClock, X } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { addDaysIso, formatDayLabel, parseIso, startOfWeekIso, toIsoDate, todayIso } from "../../lib/date";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// react-day-picker + date-fns only load the first time a calendar opens.
const Calendar = lazy(() => import("./calendar").then((m) => ({ default: m.Calendar })));

type DatePickerProps = {
  /** ISO yyyy-mm-dd, or "" for no date. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Custom trigger; defaults to a bordered field. */
  children?: ReactNode;
  align?: "start" | "center" | "end";
};

/** Date popover with one-click shortcuts (today, tomorrow, next week) above a calendar. */
export function DatePicker({ value, onChange, placeholder = "Chọn ngày", children, align = "start" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseIso(value) : undefined;
  const today = todayIso();
  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };
  const quick = [
    { label: "Hôm nay", iso: today },
    { label: "Ngày mai", iso: addDaysIso(today, 1) },
    { label: "Tuần sau", iso: addDaysIso(startOfWeekIso(today), 7) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-left text-[13px] outline-none transition-colors hover:bg-surface-muted",
              value ? "text-ink" : "text-ink-faint",
            )}
          >
            <CalendarClock size={14} className="shrink-0 text-ink-faint" />
            <span className="flex-1 truncate">{value ? formatDayLabel(value) : placeholder}</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <div className="mb-1 flex flex-wrap gap-1 px-1">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => pick(q.iso)}
              className={cn(
                "h-7 rounded-[6px] border border-line px-2 text-[12px] font-medium transition-colors hover:bg-surface-hover",
                value === q.iso ? "border-transparent bg-accent-soft text-accent-ink" : "text-ink-soft",
              )}
            >
              {q.label}
            </button>
          ))}
          {value ? (
            <button
              type="button"
              onClick={() => pick("")}
              className="ml-auto flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] font-medium text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <X size={12} />
              Bỏ ngày
            </button>
          ) : null}
        </div>
        <Suspense fallback={<div className="h-[300px] w-[252px]" />}>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => pick(d ? toIsoDate(d) : "")}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

import { CalendarMinus, CalendarPlus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ui } from "../../components/shell/ui-store";
import { Button } from "../../components/ui/button";
import { IconButton } from "../../components/ui/icon-button";
import { cn } from "../../lib/cn";
import { todayIso } from "../../lib/date";
import { formatHours } from "../../lib/duration";
import { taskActions } from "../tasks/task-store";
import type { Task } from "../tasks/task-types";
import type { Capacity } from "./planning-model";

/** Add a task to today's plan, or take it out. */
export function PlanToggle({ task, planned }: { task: Task; planned?: boolean }) {
  return planned ? (
    <IconButton size="sm" aria-label="Bỏ khỏi kế hoạch hôm nay" onClick={() => taskActions.patch(task.id, { plannedFor: "" })}>
      <CalendarMinus size={14} />
    </IconButton>
  ) : (
    <IconButton size="sm" aria-label="Thêm vào kế hoạch hôm nay" onClick={() => taskActions.patch(task.id, { plannedFor: todayIso() })}>
      <CalendarPlus size={14} />
    </IconButton>
  );
}

/** Today's plan with a load bar: remaining estimates against daily capacity. */
export function PlanCard({
  planned,
  capacity,
  renderRow,
  onAdd,
}: {
  planned: Task[];
  capacity: Capacity;
  renderRow: (t: Task) => ReactNode;
  onAdd: () => void;
}) {
  const over = capacity.overBy > 0;
  const pct = Math.min(100, capacity.ratio * 100);
  return (
    <section className="rounded-[12px] border border-line">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink">Kế hoạch hôm nay</h3>
        <span className="font-mono text-[11px] tabular-nums text-ink-faint">{planned.length}</span>
        <button
          type="button"
          onClick={() => ui.openSettings("reminders")}
          className="ml-auto font-mono text-[12px] tabular-nums text-ink-soft hover:text-ink"
          title="Đổi sức chứa mỗi ngày"
        >
          <span className={cn(over ? "text-danger" : "text-ink")}>{formatHours(capacity.plannedHours)}</span> / {formatHours(capacity.capacityHours)}
        </button>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover" role="meter" aria-valuemin={0} aria-valuemax={capacity.capacityHours} aria-valuenow={capacity.plannedHours} aria-label="Tải kế hoạch hôm nay">
          <div className={cn("h-full rounded-full transition-[width] duration-300", over ? "bg-danger" : capacity.ratio > 0.85 ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>
        <p className="w-full text-[12px] text-ink-faint">
          {over
            ? `Quá tải ${formatHours(capacity.overBy)} — cân nhắc dời bớt việc sang ngày khác.`
            : planned.length
              ? `Còn trống ${formatHours(capacity.capacityHours - capacity.plannedHours)}.`
              : "Chọn việc từ gợi ý bên dưới (biểu tượng lịch +) hoặc thêm việc mới."}
          {capacity.unestimated ? ` ${capacity.unestimated} việc chưa ước lượng giờ nên chưa được tính.` : ""}
        </p>
      </header>
      <div className="p-1.5" role="list">
        {planned.map(renderRow)}
        <Button size="sm" variant="ghost" onClick={onAdd} className="mt-0.5 w-full justify-start">
          <Plus size={14} />
          Thêm việc vào hôm nay
        </Button>
      </div>
    </section>
  );
}

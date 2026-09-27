import { CalendarDays, GanttChart, KanbanSquare, List, ListFilter, Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { cn } from "../../../lib/cn";
import {
  EMPTY_FILTER,
  GROUP_LABELS,
  SORT_LABELS,
  isFilterActive,
  type DueFilter,
  type GroupBy,
  type SortBy,
  type TaskFilter,
} from "../task-selectors";
import { PRIORITY_META, STATUS_META, TASK_PRIORITIES, TASK_STATUSES } from "../task-types";
import type { ViewKind, ViewPrefs } from "../use-view-prefs";
import { PriorityIcon, StatusIcon } from "./task-icons";

const VIEWS: { id: ViewKind; label: string; icon: ReactNode }[] = [
  { id: "board", label: "Board", icon: <KanbanSquare size={14} /> },
  { id: "list", label: "Danh sách", icon: <List size={14} /> },
  { id: "calendar", label: "Lịch", icon: <CalendarDays size={14} /> },
  { id: "timeline", label: "Timeline", icon: <GanttChart size={14} /> },
];

const DUE_OPTIONS: { id: DueFilter; label: string }[] = [
  { id: "any", label: "Bất kỳ" },
  { id: "overdue", label: "Quá hạn" },
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "7 ngày tới" },
  { id: "none", label: "Chưa có hạn" },
];

type FilterBarProps = {
  prefs: ViewPrefs;
  onPrefs: (patch: Partial<ViewPrefs>) => void;
  filter: TaskFilter;
  onFilter: (f: TaskFilter) => void;
  tags: string[];
  /** How many tasks match, shown next to the controls. */
  count: number;
};

/** View switcher + quick search + filter and display popovers. */
export function FilterBar({ prefs, onPrefs, filter, onFilter, tags, count }: FilterBarProps) {
  const active = isFilterActive(filter);
  const activeCount =
    filter.statuses.length + filter.priorities.length + filter.tags.length + (filter.due !== "any" ? 1 : 0);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-2 sm:px-4">
      <div role="tablist" aria-label="Kiểu xem" className="flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={prefs.view === v.id}
            onClick={() => onPrefs({ view: v.id })}
            title={v.label}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors",
              prefs.view === v.id ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:text-ink",
            )}
          >
            {v.icon}
            <span className="hidden md:inline">{v.label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden font-mono text-[11px] tabular-nums text-ink-faint sm:inline">{count} task</span>
        <label className="relative">
          <span className="sr-only">Lọc theo chữ</span>
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={filter.text}
            onChange={(e) => onFilter({ ...filter, text: e.target.value })}
            placeholder="Lọc nhanh…"
            className="h-7 w-32 rounded-[var(--radius-control)] border border-line bg-surface pl-7 pr-2 text-[12.5px] outline-none transition-[width,border-color] placeholder:text-ink-faint focus:w-44 focus:border-line-strong sm:w-40 sm:focus:w-52"
          />
        </label>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant={active ? "secondary" : "ghost"} className={cn(active && "border-accent/40 text-accent-ink")}>
              <ListFilter size={14} />
              Lọc
              {activeCount ? <span className="font-mono text-[11px]">{activeCount}</span> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[300px] space-y-3 p-3">
            <FilterGroup label="Trạng thái">
              {TASK_STATUSES.map((s) => (
                <ToggleChip
                  key={s}
                  active={filter.statuses.includes(s)}
                  onClick={() => onFilter({ ...filter, statuses: toggle(filter.statuses, s) })}
                >
                  <StatusIcon status={s} size={12} />
                  {STATUS_META[s].label}
                </ToggleChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Ưu tiên">
              {[...TASK_PRIORITIES].reverse().map((p) => (
                <ToggleChip
                  key={p}
                  active={filter.priorities.includes(p)}
                  onClick={() => onFilter({ ...filter, priorities: toggle(filter.priorities, p) })}
                >
                  <PriorityIcon priority={p} size={12} />
                  {PRIORITY_META[p].label}
                </ToggleChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Hạn chót">
              {DUE_OPTIONS.map((o) => (
                <ToggleChip key={o.id} active={filter.due === o.id} onClick={() => onFilter({ ...filter, due: o.id })}>
                  {o.label}
                </ToggleChip>
              ))}
            </FilterGroup>
            {tags.length ? (
              <FilterGroup label="Tag">
                {tags.map((tag) => (
                  <ToggleChip
                    key={tag}
                    active={filter.tags.includes(tag)}
                    onClick={() => onFilter({ ...filter, tags: toggle(filter.tags, tag) })}
                  >
                    #{tag}
                  </ToggleChip>
                ))}
              </FilterGroup>
            ) : null}
          </PopoverContent>
        </Popover>

        {active ? (
          <Button size="sm" variant="ghost" onClick={() => onFilter(EMPTY_FILTER)} aria-label="Xoá bộ lọc">
            <X size={13} />
            <span className="hidden sm:inline">Xoá lọc</span>
          </Button>
        ) : null}

        {prefs.view === "list" || prefs.view === "board" ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="Tuỳ chọn hiển thị">
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Hiển thị</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[260px] space-y-3 p-3">
              {prefs.view === "list" ? (
                <Row label="Nhóm theo">
                  <Select value={prefs.groupBy} onValueChange={(v) => onPrefs({ groupBy: v as GroupBy })}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
                        <SelectItem key={g} value={g}>
                          {GROUP_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
              ) : null}
              <Row label="Sắp xếp">
                <Select value={prefs.sortBy} onValueChange={(v) => onPrefs({ sortBy: v as SortBy })}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABELS) as SortBy[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SORT_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Hiện task đã xong">
                <Switch checked={prefs.showDone} onChange={(v) => onPrefs({ showDone: v })} />
              </Row>
              {prefs.view === "board" && prefs.sortBy !== "manual" ? (
                <p className="text-[11.5px] leading-snug text-ink-faint">Kéo để sắp xếp chỉ dùng được khi sắp xếp "Thủ công".</p>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-medium text-ink-faint">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-[6px] border px-2 text-[12px] font-medium transition-colors",
        active ? "border-transparent bg-accent-soft text-accent-ink" : "border-line text-ink-soft hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full transition-colors",
        checked ? "bg-accent-strong" : "bg-surface-hover",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[16px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

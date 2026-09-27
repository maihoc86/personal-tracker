import { CalendarCheck2, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "../components/shell/page-header";
import { ui } from "../components/shell/ui-store";
import { Button } from "../components/ui/button";
import { FocusWidget } from "../features/focus/focus-widget";
import { HabitList } from "../features/habits/habit-list";
import { AREA_META, type Area } from "../features/projects/project-types";
import { useProjects } from "../features/projects/project-store";
import { TaskRow } from "../features/tasks/components/task-row";
import { openBlockers, projectMap, taskArea, taskKey, todayBuckets } from "../features/tasks/task-selectors";
import { useTasks } from "../features/tasks/task-store";
import type { Task } from "../features/tasks/task-types";
import { cn } from "../lib/cn";
import { formatDayLabel, parseIso, todayIso, WEEKDAY_LONG } from "../lib/date";
import { useLocalStorage } from "../lib/use-local-storage";

type AreaFilter = "all" | Area;

/** The daily cockpit: what's late, what's due, what's next — work and life together. */
export function TodayPage() {
  const tasks = useTasks();
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const [area, setArea] = useLocalStorage<AreaFilter>("pt.today-area", "all");
  const today = todayIso();
  const startOfToday = parseIso(today).getTime();
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const scoped = useMemo(
    () => (area === "all" ? tasks : tasks.filter((t) => taskArea(t, pm) === area)),
    [tasks, pm, area],
  );
  const b = useMemo(() => todayBuckets(scoped, today, startOfToday), [scoped, today, startOfToday]);
  const d = parseIso(today);
  const dueNow = b.overdue.length + b.today.length;

  const row = (t: Task, hideDue = false) => (
    <TaskRow key={t.id} task={t} keyLabel={taskKey(t, pm)} project={pm.get(t.projectId)} blocked={openBlockers(t, byId).length} hideDue={hideDue} />
  );

  return (
    <>
      <PageHeader
        title="Hôm nay"
        icon={<CalendarCheck2 size={16} className="text-ink-faint" />}
        actions={
          <Button variant="primary" size="sm" onClick={() => ui.openQuickAdd({ dueDate: today })}>
            <Plus size={14} />
            <span className="hidden sm:inline">Việc hôm nay</span>
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-6 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-6">
              <p className="font-mono text-[12px] text-ink-faint">{WEEKDAY_LONG[d.getDay()]}</p>
              <h2 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {d.getDate()} tháng {d.getMonth() + 1}
              </h2>
              <p className="mt-1 text-[13.5px] text-ink-soft">{summary(b.overdue.length, b.today.length, b.upcoming.length, b.doneToday.length)}</p>
              <AreaSwitch value={area} onChange={setArea} />
            </div>

            <div className="space-y-6">
              {b.overdue.length ? (
                <Section title="Quá hạn" count={b.overdue.length} tone="danger">
                  {b.overdue.map((t) => row(t))}
                </Section>
              ) : null}
              <Section
                title="Hạn hôm nay"
                count={b.today.length}
                tone="warn"
                empty={dueNow === 0 ? "Không có việc nào đến hạn hôm nay. Kéo một việc từ bên dưới lên hoặc tạo việc mới." : "Không còn việc nào hạn hôm nay."}
              >
                {b.today.map((t) => row(t, true))}
              </Section>
              {b.inProgress.length ? (
                <Section title="Đang làm" count={b.inProgress.length}>
                  {b.inProgress.map((t) => row(t))}
                </Section>
              ) : null}
              <Section title="7 ngày tới" count={b.upcoming.length} empty="Tuần tới chưa có việc nào có hạn.">
                {groupByDay(b.upcoming).map(([iso, list]) => (
                  <div key={iso}>
                    <p className="px-2 pb-0.5 pt-2 text-[11.5px] font-medium text-ink-faint">{formatDayLabel(iso, today)}</p>
                    {list.map((t) => row(t, true))}
                  </div>
                ))}
              </Section>
              {b.doneToday.length ? (
                <Section title="Xong hôm nay" count={b.doneToday.length} tone="accent" collapsible>
                  {b.doneToday.map((t) => row(t))}
                </Section>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <FocusWidget suggestions={[...b.overdue, ...b.today, ...b.inProgress]} />
            <div className="rounded-[12px] border border-line p-4">
              <h3 className="mb-2 text-[12px] font-semibold text-ink-soft">Thói quen hôm nay</h3>
              <HabitList compact />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function summary(overdue: number, due: number, upcoming: number, done: number): string {
  const parts: string[] = [];
  if (overdue) parts.push(`${overdue} việc quá hạn`);
  if (due) parts.push(`${due} việc đến hạn hôm nay`);
  if (!parts.length) parts.push("Không có việc gấp");
  const tail = [upcoming ? `${upcoming} việc trong 7 ngày tới` : "", done ? `đã xong ${done} việc` : ""].filter(Boolean);
  return `${parts.join(", ")}${tail.length ? ` · ${tail.join(" · ")}` : ""}.`;
}

function groupByDay(tasks: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>();
  for (const t of tasks) map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
  return [...map.entries()];
}

function AreaSwitch({ value, onChange }: { value: AreaFilter; onChange: (v: AreaFilter) => void }) {
  const options: { id: AreaFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "work", label: AREA_META.work.label },
    { id: "personal", label: AREA_META.personal.label },
  ];
  return (
    <div role="radiogroup" aria-label="Khu vực" className="mt-4 inline-flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-[12.5px] font-medium transition-colors",
            value === o.id ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.id !== "all" ? <span className="h-2.5 w-[3px] rounded-full" style={{ backgroundColor: `var(--color-${o.id})` }} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  empty,
  collapsible,
  children,
}: {
  title: string;
  count: number;
  tone?: "danger" | "warn" | "accent";
  empty?: string;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={cn("mb-1 flex w-full items-center gap-2 border-b border-line px-2 pb-2 text-left", !collapsible && "cursor-default")}
        aria-expanded={collapsible ? open : undefined}
      >
        {collapsible ? <ChevronRight size={13} className={cn("text-ink-faint transition-transform", open && "rotate-90")} /> : null}
        <h3
          className={cn(
            "text-[13px] font-semibold",
            tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "accent" ? "text-accent-ink" : "text-ink",
          )}
        >
          {title}
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-ink-faint">{count}</span>
      </button>
      {open ? (
        count ? (
          <div role="list">{children}</div>
        ) : empty ? (
          <p className="px-2 py-3 text-[12.5px] text-ink-faint">{empty}</p>
        ) : null
      ) : null}
    </section>
  );
}

import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { PageHeader } from "../components/shell/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useFocus } from "../features/focus/focus-store";
import { FlowChart, WorkloadChart } from "../features/insights/charts";
import { computeKpis, estimateAccuracy, flowSeries, mostOverdue, workloadByProject } from "../features/insights/insight-selectors";
import { useProjects } from "../features/projects/project-store";
import { AREAS, AREA_META } from "../features/projects/project-types";
import { ProjectSwatch } from "../features/tasks/components/task-icons";
import { projectMap, scopeTasks, taskKey, type Scope } from "../features/tasks/task-selectors";
import { useTasks } from "../features/tasks/task-store";
import { cn } from "../lib/cn";
import { diffDays, parseIso, todayIso } from "../lib/date";
import { formatHours, formatMinutes } from "../lib/duration";
import { navigate, openTask } from "../lib/router";
import { useLocalStorage } from "../lib/use-local-storage";

const RANGES = [7, 14, 30, 90] as const;
const DAY = 86_400_000;

/** Throughput, workload, estimate accuracy and focus — for work, life, or one project. */
export function InsightsPage() {
  const tasks = useTasks();
  const projects = useProjects();
  const focus = useFocus();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const [range, setRange] = useLocalStorage<number>("pt.insights-range", 14);
  const [scopeId, setScopeId] = useLocalStorage<string>("pt.insights-scope", "all");
  const today = todayIso();

  const scope: Scope =
    scopeId === "all"
      ? { kind: "all" }
      : scopeId === "work" || scopeId === "personal"
        ? { kind: "area", area: scopeId }
        : pm.has(scopeId)
          ? { kind: "project", id: scopeId }
          : { kind: "all" };
  const scoped = useMemo(() => scopeTasks(tasks, scope, pm), [tasks, pm, scopeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const scopedIds = useMemo(() => new Set(scoped.map((t) => t.id)), [scoped]);
  const sessions = useMemo(
    () => (scope.kind === "all" ? focus.sessions : focus.sessions.filter((s) => scopedIds.has(s.taskId))),
    [focus.sessions, scopedIds, scope.kind],
  );

  const kpis = useMemo(() => computeKpis(scoped, sessions, range, today), [scoped, sessions, range, today]);
  const flow = useMemo(() => flowSeries(scoped, range, today), [scoped, range, today]);
  const workload = useMemo(() => workloadByProject(scoped, projects), [scoped, projects]);
  const since = parseIso(today).getTime() + DAY - range * DAY;
  const accuracy = useMemo(() => estimateAccuracy(scoped, projects, since), [scoped, projects, since]);
  const overdue = useMemo(() => mostOverdue(scoped, today), [scoped, today]);
  const delta = kpis.completed - kpis.completedPrev;

  return (
    <>
      <PageHeader title="Insights" icon={<BarChart3 size={16} className="text-ink-faint" />} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Khoảng thời gian" className="flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={range === r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "h-7 rounded-[6px] px-3 text-[12.5px] font-medium",
                    range === r ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {r} ngày
                </button>
              ))}
            </div>
            <Select value={scope.kind === "all" && scopeId !== "all" ? "all" : scopeId} onValueChange={setScopeId}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dự án</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    Khu vực: {AREA_META[a].label}
                  </SelectItem>
                ))}
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line lg:grid-cols-5">
            <Stat
              label={`Hoàn thành · ${range} ngày`}
              value={kpis.completed}
              detail={
                <span className={cn("inline-flex items-center gap-0.5", delta > 0 ? "text-accent-ink" : delta < 0 ? "text-ink-soft" : "text-ink-faint")}>
                  {delta > 0 ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : null}
                  {delta === 0 ? "bằng" : `${delta > 0 ? "+" : ""}${delta}`} so với {range} ngày trước
                </span>
              }
            />
            <Stat label={`Tạo mới · ${range} ngày`} value={kpis.created} detail={kpis.created > kpis.completed ? "Việc đến nhiều hơn việc xong" : "Việc xong theo kịp việc đến"} />
            <Stat label="Đang mở" value={kpis.open} detail={workload.reduce((s, w) => s + w.hours, 0) ? `${formatHours(workload.reduce((s, w) => s + w.hours, 0))} ước lượng còn lại` : "Chưa ước lượng"} />
            <Stat
              label="Quá hạn"
              value={kpis.overdue}
              tone={kpis.overdue ? "danger" : undefined}
              detail={kpis.overdue ? <span className="inline-flex items-center gap-1 text-danger"><AlertTriangle size={11} /> Cần xử lý</span> : "Không có việc trễ"}
            />
            <Stat label={`Giờ làm · ${range} ngày`} value={formatMinutes(kpis.loggedMinutes)} detail={`${formatMinutes(kpis.focusMinutes)} từ Focus`} className="col-span-2 lg:col-span-1" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card title="Luồng việc" hint={range > 31 ? "Theo tuần" : "Theo ngày"}>
              <FlowChart data={flow} />
            </Card>
            <Card title="Khối lượng đang mở theo dự án">
              {workload.length ? (
                <WorkloadChart rows={workload} onSelect={(id) => (id ? navigate({ name: "project", id }) : navigate({ name: "inbox" }))} />
              ) : (
                <Empty>Không có việc nào đang mở.</Empty>
              )}
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Ước lượng so với thực tế" hint={`Task xong trong ${range} ngày có cả ước lượng và giờ log`}>
              {accuracy.length ? (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11.5px] text-ink-faint">
                      <th className="pb-2 font-medium">Dự án</th>
                      <th className="pb-2 text-right font-medium">Task</th>
                      <th className="pb-2 text-right font-medium">Ước lượng</th>
                      <th className="pb-2 text-right font-medium">Thực tế</th>
                      <th className="pb-2 text-right font-medium">Chênh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accuracy.map((a) => {
                      const diff = Math.round(((a.logged - a.estimate) / a.estimate) * 100);
                      return (
                        <tr key={a.id || "inbox"} className="border-t border-line">
                          <td className="py-2">
                            <span className="flex items-center gap-2">
                              <ProjectSwatch color={a.color} size={9} />
                              {a.name}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums">{a.count}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{formatHours(a.estimate)}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{formatHours(a.logged)}</td>
                          <td className={cn("py-2 text-right font-mono tabular-nums", diff > 20 ? "text-danger" : diff < -20 ? "text-accent-ink" : "text-ink-soft")}>
                            <span className="inline-flex items-center gap-0.5">
                              {diff > 20 ? <ArrowUpRight size={11} /> : diff < -20 ? <ArrowDownRight size={11} /> : null}
                              {diff > 0 ? "+" : ""}
                              {diff}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <Empty>Chưa có task nào vừa có ước lượng vừa có giờ log trong khoảng này. Đặt "Ước lượng" và log giờ (hoặc chạy Focus gắn task) để thấy độ chính xác.</Empty>
              )}
            </Card>
            <Card title="Trễ hạn lâu nhất">
              {overdue.length ? (
                <ul className="space-y-px">
                  {overdue.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => openTask(t.id)} className="flex h-9 w-full items-center gap-2.5 rounded-[6px] px-1.5 text-left text-[12.5px] hover:bg-surface-muted/70">
                        <span className="w-16 shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(t, pm)}</span>
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-danger">trễ {diffDays(t.dueDate, today)} ngày</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Không có việc nào trễ hạn. Giữ vững nhé.</Empty>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "danger";
  className?: string;
}) {
  return (
    <div className={cn("bg-surface px-4 py-3.5", className)}>
      <p className="text-[11.5px] text-ink-faint">{label}</p>
      <p className={cn("mt-1 text-[26px] font-semibold leading-none tracking-tight", tone === "danger" ? "text-danger" : "text-ink")}>{value}</p>
      {detail ? <p className="mt-1.5 truncate text-[11.5px] text-ink-faint">{detail}</p> : null}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[12px] border border-line p-4 sm:p-5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {hint ? <span className="text-right text-[11.5px] text-ink-faint">{hint}</span> : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[12.5px] leading-relaxed text-ink-faint">{children}</p>;
}

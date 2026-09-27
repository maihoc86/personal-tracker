import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { formatHours } from "../../lib/duration";
import { ProjectSwatch } from "../tasks/components/task-icons";
import { niceMax, type FlowBucket, type Workload } from "./insight-selectors";

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function TableView({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 text-[12.5px]">
      <summary className="cursor-pointer select-none text-[12px] text-ink-faint hover:text-ink-soft">Xem dạng bảng</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-[8px] border border-line">{children}</div>
    </details>
  );
}

const th = "sticky top-0 bg-surface-muted px-3 py-1.5 text-left text-[11.5px] font-medium text-ink-soft";
const td = "border-t border-line px-3 py-1.5";

/** Completed (accent) vs created (gray) per bucket — is the pile shrinking? */
export function FlowChart({ data }: { data: FlowBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.created, d.completed])));
  const pct = (v: number) => `${(v / max) * 100}%`;
  const labelAt = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <Legend
        items={[
          { label: "Hoàn thành", color: "var(--color-accent)" },
          { label: "Tạo mới", color: "var(--color-chart-muted)" },
        ]}
      />
      <div className="relative mt-3 h-48 pl-8" onMouseLeave={() => setHover(null)}>
        {[0, max / 2, max].map((tick) => (
          <div key={tick} className="absolute inset-x-0 flex items-center" style={{ bottom: pct(tick) }}>
            <span className="w-7 pr-1.5 text-right font-mono text-[10.5px] tabular-nums text-ink-faint">{tick}</span>
            <span className="h-px flex-1 bg-line/70" />
          </div>
        ))}
        <div className="relative flex h-full items-end" role="list" aria-label="Luồng việc theo thời gian">
          {data.map((d, i) => (
            <div
              key={d.start}
              role="listitem"
              tabIndex={0}
              aria-label={`${d.label}: hoàn thành ${d.completed}, tạo mới ${d.created}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={cn("relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-[4px] outline-none", hover === i && "bg-surface-muted/70")}
            >
              <span className="w-full max-w-[10px] rounded-t-[4px] bg-accent" style={{ height: pct(d.completed) }} />
              <span className="w-full max-w-[10px] rounded-t-[4px] bg-chart-muted" style={{ height: pct(d.created) }} />
            </div>
          ))}
        </div>
        {h && hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 w-36 -translate-x-1/2 rounded-[8px] border border-line bg-surface px-2.5 py-2 text-[12px] shadow-[var(--shadow-float)]"
            style={{ left: `calc(2rem + (100% - 2rem) * ${(hover + 0.5) / data.length})` }}
          >
            <p className="mb-1 text-[11px] text-ink-faint">{h.label}</p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-accent" />
              <span className="font-semibold tabular-nums text-ink">{h.completed}</span>
              <span className="text-ink-soft">hoàn thành</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-chart-muted" />
              <span className="font-semibold tabular-nums text-ink">{h.created}</span>
              <span className="text-ink-soft">tạo mới</span>
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex pl-8">
        {data.map((d, i) => (
          <span key={d.start} className="flex-1 whitespace-nowrap text-center text-[10.5px] text-ink-faint">
            {labelAt.has(i) ? d.label.split("–")[0] : ""}
          </span>
        ))}
      </div>
      <TableView>
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Thời gian</th>
              <th className={cn(th, "text-right")}>Hoàn thành</th>
              <th className={cn(th, "text-right")}>Tạo mới</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.start}>
                <td className={td}>{d.label}</td>
                <td className={cn(td, "text-right font-mono tabular-nums")}>{d.completed}</td>
                <td className={cn(td, "text-right font-mono tabular-nums")}>{d.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableView>
    </div>
  );
}

const SEGMENTS = [
  { key: "backlog", label: "Backlog", color: "var(--color-seq-1)" },
  { key: "todo", label: "Cần làm", color: "var(--color-seq-2)" },
  { key: "doing", label: "Đang làm", color: "var(--color-seq-3)" },
] as const;

/** Open work per project as stacked bars on one shared scale. */
export function WorkloadChart({ rows, onSelect }: { rows: Workload[]; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = (w: Workload) => w.backlog + w.todo + w.doing;
  const max = Math.max(1, ...rows.map(total));

  return (
    <div>
      <Legend items={SEGMENTS.map((s) => ({ label: s.label, color: s.color }))} />
      <ul className="mt-3 space-y-1.5">
        {rows.map((w) => (
          <li key={w.id || "inbox"}>
            <button
              type="button"
              onClick={() => onSelect?.(w.id)}
              className="grid w-full grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 rounded-[6px] px-1 py-1 text-left hover:bg-surface-muted/60"
            >
              <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink">
                <ProjectSwatch color={w.color} size={9} />
                <span className="truncate">{w.name}</span>
              </span>
              <span className="flex h-3.5 gap-[2px]" style={{ width: `${(total(w) / max) * 100}%` }}>
                {SEGMENTS.map((s) =>
                  w[s.key] ? (
                    <span
                      key={s.key}
                      onMouseEnter={() => setHover(`${w.id}:${s.key}`)}
                      onMouseLeave={() => setHover(null)}
                      title={`${s.label}: ${w[s.key]} task`}
                      className={cn(
                        "relative h-full first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity",
                        hover && hover !== `${w.id}:${s.key}` && "opacity-60",
                      )}
                      style={{ flexGrow: w[s.key], backgroundColor: s.color }}
                    />
                  ) : null,
                )}
              </span>
              <span className="whitespace-nowrap text-right text-[12px] text-ink-soft">
                <span className="font-semibold tabular-nums text-ink">{total(w)}</span> việc
                {w.hours ? <span className="text-ink-faint"> · {formatHours(w.hours)}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <TableView>
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Dự án</th>
              {SEGMENTS.map((s) => (
                <th key={s.key} className={cn(th, "text-right")}>
                  {s.label}
                </th>
              ))}
              <th className={cn(th, "text-right")}>Ước lượng còn</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id || "inbox"}>
                <td className={td}>{w.name}</td>
                {SEGMENTS.map((s) => (
                  <td key={s.key} className={cn(td, "text-right font-mono tabular-nums")}>
                    {w[s.key]}
                  </td>
                ))}
                <td className={cn(td, "text-right font-mono tabular-nums")}>{w.hours ? formatHours(w.hours) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableView>
    </div>
  );
}

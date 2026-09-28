import { cn } from "../../../lib/cn";
import type { TaskPriority, TaskStatus } from "../task-types";

/**
 * Status glyphs read as progress around a circle: dashed (not planned), empty
 * (ready), half (in progress), filled check (done) — so a column of them
 * scans without reading labels.
 */
export function StatusIcon({
  status,
  size = 14,
  className,
  color,
}: {
  status: TaskStatus;
  size?: number;
  className?: string;
  /** Custom stage tint; replaces the category colour. */
  color?: string;
}) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", "aria-hidden": true, style: color ? { color } : undefined } as const;
  if (status === "done") {
    return (
      <svg {...common} className={cn("shrink-0 text-accent", className)}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M4.8 8.3 7 10.4 11.2 5.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "doing") {
    return (
      <svg {...common} className={cn("shrink-0 text-warn", className)}>
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common} className={cn("shrink-0", status === "todo" ? "text-ink-soft" : "text-ink-faint", className)}>
      <circle
        cx="8"
        cy="8"
        r="6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray={status === "backlog" ? "2.4 2.1" : undefined}
      />
    </svg>
  );
}

/** Signal-bar priority, with urgent as a solid red "!" tile. */
export function PriorityIcon({ priority, size = 14, className }: { priority: TaskPriority; size?: number; className?: string }) {
  if (priority === "urgent") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={cn("shrink-0 text-danger", className)}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.6v4.2" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="1.05" fill="#fff" />
      </svg>
    );
  }
  const filled = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={cn("shrink-0 text-ink-soft", className)}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={11 - i * 3.5}
          width="3"
          height={3 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < filled ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

/** Project marker: a small rounded square in the project colour. */
export function ProjectSwatch({ color, size = 10, className }: { color?: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-[3px]", !color && "border border-dashed border-ink-faint", className)}
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

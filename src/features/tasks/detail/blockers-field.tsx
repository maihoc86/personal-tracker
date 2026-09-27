import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { cn } from "../../../lib/cn";
import { openTask } from "../../../lib/router";
import { matchesQuery } from "../../../lib/text";
import { StatusIcon } from "../components/task-icons";
import { taskKey, type ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import type { Task } from "../task-types";

/** "Bị chặn bởi": link tasks that must finish first; open blockers show in red. */
export function BlockersField({ task, allTasks, projects }: { task: Task; allTasks: Task[]; projects: ProjectMap }) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);
  const blockers = task.blockedBy.map((id) => byId.get(id)).filter((t): t is Task => !!t);
  const candidates = useMemo(
    () =>
      allTasks
        .filter((t) => t.id !== task.id && !task.blockedBy.includes(t.id) && t.status !== "done")
        .filter((t) => matchesQuery(`${taskKey(t, projects)} ${t.title}`, query))
        .slice(0, 8),
    [allTasks, task, projects, query],
  );

  const setBlockedBy = (ids: string[]) => taskActions.patch(task.id, { blockedBy: ids });

  return (
    <div className="space-y-1">
      {blockers.map((b) => (
        <div key={b.id} className="group flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] hover:bg-surface-hover/70">
          <StatusIcon status={b.status} size={12} />
          <button type="button" onClick={() => openTask(b.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            <span className={cn("shrink-0 whitespace-nowrap font-mono text-[10.5px]", b.status === "done" ? "text-ink-faint" : "text-danger")}>{taskKey(b, projects)}</span>
            <span className={cn("truncate", b.status === "done" && "text-ink-faint line-through")}>{b.title}</span>
          </button>
          <button
            type="button"
            onClick={() => setBlockedBy(task.blockedBy.filter((id) => id !== b.id))}
            aria-label="Bỏ liên kết"
            className="grid h-5 w-5 place-items-center rounded-[4px] text-ink-faint opacity-0 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <Popover onOpenChange={() => setQuery("")}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] text-ink-faint hover:bg-surface-hover/70 hover:text-ink-soft">
            <Plus size={13} />
            Thêm task chặn
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-1.5">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã hoặc tên task…"
            className="mb-1 h-8 w-full rounded-[6px] border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-line-strong"
          />
          {candidates.length ? (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setBlockedBy([...task.blockedBy, c.id])}
                className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[12.5px] hover:bg-surface-hover"
              >
                <StatusIcon status={c.status} size={12} />
                <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(c, projects)}</span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-[12px] text-ink-faint">Không tìm thấy task đang mở nào.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

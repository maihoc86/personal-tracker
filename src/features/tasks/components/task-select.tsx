import { X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { matchesQuery } from "../../../lib/text";
import { useProjects } from "../../projects/project-store";
import { projectMap, taskKey } from "../task-selectors";
import { useTasks } from "../task-store";
import type { Task } from "../task-types";
import { StatusIcon } from "./task-icons";

type TaskSelectProps = {
  value: string;
  onChange: (taskId: string) => void;
  /** Shown first when the search is empty. */
  suggestions?: Task[];
  children: ReactNode;
};

/** Searchable picker over open tasks (used to link a Focus session to a task). */
export function TaskSelect({ value, onChange, suggestions = [], children }: TaskSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const tasks = useTasks();
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);

  const options = useMemo(() => {
    const openTasks = tasks.filter((t) => t.status !== "done");
    if (!query.trim()) {
      const ids = new Set(suggestions.map((t) => t.id));
      const rest = openTasks.filter((t) => !ids.has(t.id) && t.status === "doing");
      return [...suggestions.filter((t) => t.status !== "done"), ...rest].slice(0, 8);
    }
    return openTasks.filter((t) => matchesQuery(`${taskKey(t, pm)} ${t.title}`, query)).slice(0, 10);
  }, [tasks, suggestions, query, pm]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm task đang mở…"
          aria-label="Tìm task"
          className="mb-1 h-8 w-full rounded-[6px] border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-line-strong"
        />
        <div className="max-h-72 overflow-y-auto">
          {options.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[12.5px] hover:bg-surface-hover aria-[current=true]:bg-accent-soft"
              aria-current={t.id === value}
            >
              <StatusIcon status={t.status} size={12} />
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{taskKey(t, pm)}</span>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </button>
          ))}
          {!options.length ? <p className="px-2 py-2 text-[12px] text-ink-faint">Không có task phù hợp.</p> : null}
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => pick("")}
            className="mt-1 flex h-8 w-full items-center gap-2 rounded-[6px] border-t border-line px-2 text-left text-[12.5px] text-ink-faint hover:bg-surface-hover hover:text-ink"
          >
            <X size={12} />
            Bỏ gắn task
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

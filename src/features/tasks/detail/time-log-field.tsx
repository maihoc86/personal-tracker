import { Timer, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { cn } from "../../../lib/cn";
import { formatRelativeTime } from "../../../lib/date";
import { formatHours, formatMinutes, parseDuration } from "../../../lib/duration";
import { isSubmitEnter } from "../../../lib/keyboard";
import { loggedMinutes } from "../task-selectors";
import { taskActions } from "../task-store";
import type { Task } from "../task-types";
import { Placeholder } from "./property-row";
import { propButton } from "./property-styles";

/** Logged time vs estimate, with a popover to log more or remove entries. */
export function TimeLogField({ task }: { task: Task }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const total = loggedMinutes(task);
  const est = task.estimatedHours ? task.estimatedHours * 60 : 0;
  const ratio = est ? Math.min(1, total / est) : 0;

  function submit() {
    const minutes = parseDuration(draft);
    if (!minutes) {
      setError("Nhập thời lượng như 45m, 1h30 hoặc 1.5h.");
      return;
    }
    taskActions.logTime(task.id, minutes);
    setDraft("");
    setError("");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={propButton}>
          <Timer size={14} className="shrink-0 text-ink-faint" />
          {total ? (
            <span className={cn("font-mono text-[12.5px] tabular-nums", est && total > est && "text-danger")}>
              {formatMinutes(total)}
              {est ? <span className="text-ink-faint"> / {formatHours(task.estimatedHours!)}</span> : null}
            </span>
          ) : (
            <Placeholder>Log thời gian</Placeholder>
          )}
          {est ? (
            <span className="ml-auto h-1 w-10 overflow-hidden rounded-full bg-surface-hover">
              <span className={cn("block h-full rounded-full", total > est ? "bg-danger" : "bg-accent")} style={{ width: `${ratio * 100}%` }} />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-1.5"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (isSubmitEnter(e)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="vd: 45m, 1h30"
            aria-label="Thời lượng đã làm"
            className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:border-line-strong"
          />
          <Button type="submit" size="md" variant="primary">
            Log
          </Button>
        </form>
        {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
        {task.timeLogs.length ? (
          <div className="mt-3 max-h-48 space-y-px overflow-y-auto border-t border-line pt-2">
            {[...task.timeLogs].reverse().map((log) => (
              <div key={log.id} className="group flex h-7 items-center gap-2 rounded-[5px] px-1.5 text-[12.5px] hover:bg-surface-muted">
                <span className="w-14 font-mono tabular-nums text-ink">{formatMinutes(log.minutes)}</span>
                <span className="flex-1 truncate text-ink-faint">
                  {log.source === "focus" ? "Focus" : "Thủ công"} · {formatRelativeTime(log.at)}
                </span>
                <button
                  type="button"
                  onClick={() => taskActions.removeTimeLog(task.id, log.id)}
                  aria-label="Xoá lần log"
                  className="grid h-5 w-5 place-items-center rounded-[4px] text-ink-faint opacity-0 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-ink-faint">Phiên Focus gắn với task này sẽ tự log thời gian.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

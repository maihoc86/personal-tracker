import { ArrowRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Markdown } from "../../../components/ui/markdown";
import { MOD_KEY } from "../../../lib/keyboard";
import { formatDayLabel, formatRelativeTime } from "../../../lib/date";
import type { ProjectMap } from "../task-selectors";
import { taskActions } from "../task-store";
import { PRIORITY_META, STATUS_META, type Activity, type Comment, type Task, type TaskPriority, type TaskStatus } from "../task-types";
import { SectionLabel } from "../../../components/ui/form-controls";

type Entry = { kind: "comment"; at: number; comment: Comment } | { kind: "activity"; at: number; activity: Activity };

/** Comments and the automatic history, interleaved by time, with a composer. */
export function TaskActivity({ task, projects }: { task: Task; projects: ProjectMap }) {
  const [draft, setDraft] = useState("");
  const entries = useMemo<Entry[]>(
    () =>
      [
        ...task.comments.map((comment) => ({ kind: "comment" as const, at: comment.at, comment })),
        ...task.activity.map((activity) => ({ kind: "activity" as const, at: activity.at, activity })),
      ].sort((a, b) => a.at - b.at),
    [task.comments, task.activity],
  );

  function submit() {
    if (!draft.trim()) return;
    taskActions.addComment(task.id, draft);
    setDraft("");
  }

  return (
    <div>
      <SectionLabel>Hoạt động</SectionLabel>
      <ol className="relative space-y-2.5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
        {entries.map((e) =>
          e.kind === "comment" ? (
            <li key={e.comment.id} className="group relative pl-6">
              <span className="absolute left-[3px] top-3 h-[9px] w-[9px] rounded-full border-2 border-surface bg-ink-soft" />
              <div className="rounded-[10px] border border-line bg-surface px-3 py-2">
                <div className="mb-0.5 flex items-center gap-2 text-[11.5px] text-ink-faint">
                  <span className="font-medium text-ink-soft">Bình luận</span>
                  <span>{formatRelativeTime(e.at)}</span>
                  <button
                    type="button"
                    onClick={() => taskActions.removeComment(task.id, e.comment.id)}
                    aria-label="Xoá bình luận"
                    className="ml-auto grid h-5 w-5 place-items-center rounded-[4px] opacity-0 hover:bg-surface-hover hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <Markdown className="text-[13px]">{e.comment.text}</Markdown>
              </div>
            </li>
          ) : (
            <li key={e.activity.id} className="relative flex min-h-5 items-center gap-1.5 pl-6 text-[12px] text-ink-faint">
              <span className="absolute left-[4px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-line-strong" />
              <ActivityText activity={e.activity} projects={projects} />
              <span className="shrink-0">· {formatRelativeTime(e.at)}</span>
            </li>
          ),
        )}
      </ol>

      <div className="mt-3 rounded-[10px] border border-line bg-surface focus-within:border-line-strong">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Viết bình luận… (Markdown)"
          aria-label="Bình luận"
          className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed outline-none placeholder:text-ink-faint"
        />
        <div className="flex items-center justify-end gap-2 px-2 pb-2">
          <span className="text-[11px] text-ink-faint">{MOD_KEY} Enter để gửi</span>
          <Button size="sm" variant="primary" disabled={!draft.trim()} onClick={submit}>
            Bình luận
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityText({ activity: a, projects }: { activity: Activity; projects: ProjectMap }) {
  const arrow = <ArrowRight size={11} className="shrink-0" />;
  const strong = (s: string) => <span className="font-medium text-ink-soft">{s}</span>;
  switch (a.kind) {
    case "created":
      return <span>Đã tạo task</span>;
    case "recurred":
      return <span className="truncate">Lặp lại: đã tạo lần tiếp theo, hạn {strong(a.to ? formatDayLabel(a.to) : "")}</span>;
    case "status":
      return (
        <span className="flex min-w-0 items-center gap-1 truncate">
          Trạng thái {strong(STATUS_META[a.from as TaskStatus]?.label ?? "")} {arrow} {strong(STATUS_META[a.to as TaskStatus]?.label ?? "")}
        </span>
      );
    case "priority":
      return (
        <span className="flex min-w-0 items-center gap-1 truncate">
          Ưu tiên {strong(PRIORITY_META[a.from as TaskPriority]?.label ?? "")} {arrow} {strong(PRIORITY_META[a.to as TaskPriority]?.label ?? "")}
        </span>
      );
    case "due":
      return (
        <span className="flex min-w-0 items-center gap-1 truncate">
          Hạn chót {strong(a.from ? formatDayLabel(a.from) : "trống")} {arrow} {strong(a.to ? formatDayLabel(a.to) : "trống")}
        </span>
      );
    case "project":
      return (
        <span className="flex min-w-0 items-center gap-1 truncate">
          Chuyển dự án {strong(projects.get(a.from ?? "")?.name ?? "Inbox")} {arrow} {strong(projects.get(a.to ?? "")?.name ?? "Inbox")}
        </span>
      );
  }
}

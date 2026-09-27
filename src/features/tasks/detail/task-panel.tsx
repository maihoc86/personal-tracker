import { Check, Link2, Play, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { IconButton } from "../../../components/ui/icon-button";
import { Sheet } from "../../../components/ui/sheet";
import { cn } from "../../../lib/cn";
import { isSubmitEnter } from "../../../lib/keyboard";
import { closeTask, openTask } from "../../../lib/router";
import { focusActions } from "../../focus/focus-store";
import { useProjects } from "../../projects/project-store";
import { ProjectSwatch, StatusIcon } from "../components/task-icons";
import { BlockedChip } from "../components/task-chips";
import { openBlockers, projectMap, taskKey } from "../task-selectors";
import { taskActions, useTasks } from "../task-store";
import type { Task } from "../task-types";
import { EditableMarkdown } from "./editable-markdown";
import { TaskActivity } from "./task-activity";
import { TaskChecklist } from "./task-checklist";
import { TaskProperties } from "./task-properties";

/** The task "peek" panel, driven by `?task=<id>` in the URL. */
export function TaskPanel({ taskId }: { taskId: string | null }) {
  const tasks = useTasks();
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;

  // A deep link to a task that no longer exists: drop it from the URL.
  useEffect(() => {
    if (taskId && !task) closeTask();
  }, [taskId, task]);

  return (
    <Sheet open={!!task} onClose={closeTask} label={task ? task.title : "Task"}>
      {/* Keyed by task so every draft field (checklist, tags, time log) resets
          when jumping to another task while the panel stays open. */}
      {task ? <PanelBody key={task.id} task={task} allTasks={tasks} projects={projects} pm={pm} /> : null}
    </Sheet>
  );
}

function PanelBody({
  task,
  allTasks,
  projects,
  pm,
}: {
  task: Task;
  allTasks: Task[];
  projects: ReturnType<typeof useProjects>;
  pm: ReturnType<typeof projectMap>;
}) {
  const key = taskKey(task, pm);
  const project = pm.get(task.projectId);
  const blockers = openBlockers(task, new Map(allTasks.map((t) => [t.id, t])));
  const blocking = allTasks.filter((t) => t.blockedBy.includes(task.id) && t.status !== "done");

  function remove() {
    const removed = taskActions.remove(task.id);
    closeTask();
    if (!removed) return;
    toast(`Đã xoá ${key}`, {
      action: { label: "Hoàn tác", onClick: () => taskActions.restore(removed.task, removed.index) },
    });
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    void navigator.clipboard?.writeText(url).then(
      () => toast("Đã sao chép liên kết task"),
      () => toast.error("Không sao chép được — trình duyệt chặn clipboard"),
    );
  }

  function startFocus() {
    focusActions.startOn(task.id);
    toast(`Bắt đầu Focus cho ${key}`);
  }

  const done = task.status === "done";

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
        <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-soft">
          <ProjectSwatch color={project?.color} />
          <span className="truncate">{project?.name ?? "Inbox"}</span>
          <span className="text-ink-faint">/</span>
          <span className="shrink-0 whitespace-nowrap font-mono text-[12px] text-ink-faint">{key}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant={done ? "secondary" : "accent"} onClick={() => taskActions.patch(task.id, { status: done ? "todo" : "done" })}>
            <Check size={13} />
            <span className="hidden sm:inline">{done ? "Mở lại" : "Hoàn thành"}</span>
          </Button>
          {!done ? (
            <IconButton aria-label="Bắt đầu Focus cho task này" onClick={startFocus}>
              <Play size={15} />
            </IconButton>
          ) : null}
          <IconButton aria-label="Sao chép liên kết" onClick={copyLink}>
            <Link2 size={15} />
          </IconButton>
          <IconButton aria-label="Xoá task" onClick={remove} className="hover:text-danger">
            <Trash2 size={15} />
          </IconButton>
          <IconButton aria-label="Đóng" shortcut="Esc" onClick={closeTask}>
            <X size={16} />
          </IconButton>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start overflow-y-auto lg:content-stretch lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
        <div className="space-y-6 px-4 py-5 sm:px-7 lg:overflow-y-auto">
          <div className="flex items-start gap-3">
            <StatusIcon status={task.status} size={18} className="mt-[7px]" />
            <TitleEditor task={task} />
          </div>

          {blockers.length || blocking.length ? (
            <div className="space-y-1.5 rounded-[10px] border border-line bg-surface-sunken px-3 py-2.5 text-[12.5px]">
              {blockers.length ? (
                <p className="flex flex-wrap items-center gap-1.5">
                  <BlockedChip count={blockers.length} />
                  <span className="text-ink-soft">chờ</span>
                  {blockers.map((b) => (
                    <TaskLink key={b.id} task={b} label={taskKey(b, pm)} />
                  ))}
                </p>
              ) : null}
              {blocking.length ? (
                <p className="flex flex-wrap items-center gap-1.5 text-ink-soft">
                  Đang chặn
                  {blocking.map((b) => (
                    <TaskLink key={b.id} task={b} label={taskKey(b, pm)} />
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}

          <section>
            <EditableMarkdown
              value={task.description}
              resetKey={task.id}
              onSave={(description) => taskActions.patch(task.id, { description })}
              placeholder="Thêm mô tả… (hỗ trợ Markdown: **đậm**, - danh sách, - [ ] việc)"
            />
          </section>

          <TaskChecklist items={task.checklist} onChange={(checklist) => taskActions.patch(task.id, { checklist })} />

          <div className="lg:hidden">
            <TaskProperties task={task} allTasks={allTasks} projects={projects} projectMap={pm} />
          </div>

          <TaskActivity task={task} projects={pm} />
        </div>

        <aside className="hidden border-l border-line bg-surface-sunken px-3 py-4 lg:block lg:overflow-y-auto">
          <TaskProperties task={task} allTasks={allTasks} projects={projects} projectMap={pm} />
        </aside>
      </div>
    </>
  );
}

function TaskLink({ task, label }: { task: Task; label: string }) {
  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="inline-flex max-w-[240px] items-center gap-1 rounded-[5px] border border-line bg-surface px-1.5 py-0.5 hover:border-line-strong"
    >
      <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{label}</span>
      <span className="truncate">{task.title}</span>
    </button>
  );
}

/** Always-editable title that saves on blur or Enter. */
function TitleEditor({ task }: { task: Task }) {
  const [draft, setDraft] = useState(task.title);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(task.title), [task.id, task.title]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  function commit() {
    const clean = draft.trim();
    if (clean && clean !== task.title) taskActions.patch(task.id, { title: clean });
    else setDraft(task.title);
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (isSubmitEnter(e)) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      aria-label="Tiêu đề task"
      className={cn(
        "min-w-0 flex-1 resize-none bg-transparent font-display text-[22px] font-semibold leading-snug tracking-tight text-ink outline-none",
        task.status === "done" && "text-ink-soft",
      )}
    />
  );
}

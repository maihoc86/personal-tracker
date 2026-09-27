import { CalendarClock, ChevronRight, Inbox, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ui, useUi } from "../../components/shell/ui-store";
import { Button } from "../../components/ui/button";
import { DatePicker } from "../../components/ui/date-picker";
import { Kbd } from "../../components/ui/kbd";
import { Modal } from "../../components/ui/modal";
import { cn } from "../../lib/cn";
import { formatDayLabel, todayIso } from "../../lib/date";
import { formatHours } from "../../lib/duration";
import { isSubmitEnter } from "../../lib/keyboard";
import { openTask } from "../../lib/router";
import { useProjects } from "../projects/project-store";
import { Switch } from "./components/filter-bar";
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./components/task-icons";
import { PriorityMenu, ProjectMenu, StatusMenu } from "./components/task-pickers";
import { parseQuickAdd, type QuickAddToken } from "./quick-add";
import { projectMap, taskKey } from "./task-selectors";
import { taskActions } from "./task-store";
import { PRIORITY_META, STATUS_META, type TaskDraft } from "./task-types";

const pill =
  "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-2 text-[12px] font-medium text-ink-soft transition-colors hover:bg-surface-hover data-[state=open]:bg-surface-hover";

const TOKEN_STYLE: Record<QuickAddToken["kind"], string> = {
  tag: "text-ink-soft",
  priority: "text-danger",
  due: "text-warn",
  time: "text-warn",
  project: "text-work",
  estimate: "text-ink-soft",
  status: "text-accent-ink",
};

/** Linear-style create dialog: title with inline syntax + property pills. */
export function QuickAddDialog() {
  const { quickAdd } = useUi();
  const open = quickAdd !== null;
  const projects = useProjects();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [base, setBase] = useState<Partial<TaskDraft>>({});
  const [more, setMore] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setBase({ status: "todo", priority: "medium", projectId: "", ...quickAdd });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(
    () => parseQuickAdd(title, { projects: projects.filter((p) => !p.archived), today: todayIso() }),
    [title, projects],
  );
  // Inline syntax wins over the pills while it is present in the title.
  const effective: TaskDraft = {
    ...base,
    title: parsed.title,
    status: parsed.status ?? base.status,
    priority: parsed.priority ?? base.priority,
    projectId: parsed.projectId ?? base.projectId,
    dueDate: parsed.dueDate ?? base.dueDate,
    dueTime: parsed.dueTime ?? base.dueTime,
    estimatedHours: parsed.estimatedHours ?? base.estimatedHours,
    tags: [...new Set([...(base.tags ?? []), ...parsed.tags])],
    description,
  };
  const project = pm.get(effective.projectId ?? "");

  function submit() {
    if (!effective.title.trim()) {
      titleRef.current?.focus();
      return;
    }
    const created = taskActions.add(effective);
    const key = taskKey(created, pm);
    toast(`Đã tạo ${key}`, { action: { label: "Mở", onClick: () => openTask(created.id) } });
    if (more) {
      setTitle("");
      setDescription("");
      titleRef.current?.focus();
    } else {
      ui.closeQuickAdd();
    }
  }

  const set = (patch: Partial<TaskDraft>) => setBase((b) => ({ ...b, ...patch }));

  return (
    <Modal open={open} onClose={ui.closeQuickAdd} title={null} top size="md">
      <div className="flex items-center gap-1.5 px-4 pt-3.5 text-[12.5px] text-ink-soft">
        <ProjectMenu value={effective.projectId ?? ""} onChange={(projectId) => set({ projectId })} projects={projects}>
          <button type="button" className="inline-flex h-6 items-center gap-1.5 rounded-[5px] px-1.5 hover:bg-surface-hover">
            {project ? <ProjectSwatch color={project.color} /> : <Inbox size={13} className="text-ink-faint" />}
            {project?.name ?? "Inbox"}
          </button>
        </ProjectMenu>
        <ChevronRight size={12} className="text-ink-faint" />
        <span className="text-ink-faint">Task mới</span>
      </div>

      <div className="px-4 pt-2">
        <input
          ref={titleRef}
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (isSubmitEnter(e)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Tên task"
          aria-label="Tên task"
          className="w-full bg-transparent font-display text-[19px] font-semibold tracking-tight text-ink outline-none placeholder:text-ink-faint/80"
        />
        {parsed.tokens.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {parsed.tokens.map((t, i) => (
              <span key={`${t.raw}-${i}`} className={cn("rounded-[4px] bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]", TOKEN_STYLE[t.kind])}>
                {t.raw}
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Thêm mô tả…"
          aria-label="Mô tả"
          className="mt-2 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <StatusMenu value={effective.status ?? "todo"} onChange={(status) => set({ status })}>
          <button type="button" className={pill}>
            <StatusIcon status={effective.status ?? "todo"} size={13} />
            {STATUS_META[effective.status ?? "todo"].label}
          </button>
        </StatusMenu>
        <PriorityMenu value={effective.priority ?? "medium"} onChange={(priority) => set({ priority })}>
          <button type="button" className={pill}>
            <PriorityIcon priority={effective.priority ?? "medium"} size={13} />
            {PRIORITY_META[effective.priority ?? "medium"].label}
          </button>
        </PriorityMenu>
        <DatePicker value={effective.dueDate ?? ""} onChange={(dueDate) => set({ dueDate })}>
          <button type="button" className={cn(pill, effective.dueDate && "text-ink")}>
            <CalendarClock size={13} />
            {effective.dueDate ? `${formatDayLabel(effective.dueDate)}${effective.dueTime ? ` · ${effective.dueTime}` : ""}` : "Hạn chót"}
          </button>
        </DatePicker>
        {effective.estimatedHours ? (
          <span className={cn(pill, "text-ink")}>
            <Timer size={13} />
            {formatHours(effective.estimatedHours)}
          </span>
        ) : null}
        {effective.tags?.map((tag) => (
          <span key={tag} className={pill}>
            #{tag}
          </span>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-sunken px-4 py-2.5">
        <p className="hidden min-w-0 flex-1 truncate text-[11.5px] text-ink-faint sm:block">
          Gõ nhanh: <span className="font-mono">#tag !cao @mai @14h +MÃ ~2h</span>
        </p>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-ink-soft">
          <Switch checked={more} onChange={setMore} label="Tạo thêm" />
          Tạo thêm
        </label>
        <Button variant="primary" onClick={submit} disabled={!effective.title.trim()}>
          Tạo task
          <Kbd className="border-transparent bg-white/15 text-inherit">↵</Kbd>
        </Button>
      </footer>
    </Modal>
  );
}

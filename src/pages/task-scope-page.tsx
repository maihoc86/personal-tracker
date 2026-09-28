import { FolderX, Inbox, Layers, MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { EmptyState, PageHeader } from "../components/shell/page-header";
import { ui } from "../components/shell/ui-store";
import { Button } from "../components/ui/button";
import { IconButton } from "../components/ui/icon-button";
import { ProjectActionsMenu } from "../features/projects/project-actions-menu";
import { useProjects } from "../features/projects/project-store";
import { AREA_META } from "../features/projects/project-types";
import { FilterBar } from "../features/tasks/components/filter-bar";
import { ProjectSwatch } from "../features/tasks/components/task-icons";
import {
  collectTags,
  filterTasks,
  openEstimate,
  projectMap,
  scopeTasks,
  sortTasks,
  type Scope,
} from "../features/tasks/task-selectors";
import { useTasks } from "../features/tasks/task-store";
import { STATUS_META, TASK_STATUSES, type Task, type TaskDraft } from "../features/tasks/task-types";
import { resolveStage, stagesFor } from "../features/workflow/workflow-model";
import { useWorkflow } from "../features/workflow/workflow-store";
import { useViewPrefs } from "../features/tasks/use-view-prefs";
import { BoardView, type BoardColumn } from "../features/tasks/views/board-view";
import { CalendarView } from "../features/tasks/views/calendar-view";
import { ListView } from "../features/tasks/views/list-view";
import { TimelineView } from "../features/tasks/views/timeline-view";
import { formatHours } from "../lib/duration";
import { todayIso } from "../lib/date";
import { navigate, routeKey, type Route } from "../lib/router";
import { useSettings } from "../lib/use-settings";

type ScopeRoute = Extract<Route, { name: "inbox" | "tasks" | "project" }>;

/** Inbox, All tasks, or one project — the same data through four views. */
export function TaskScopePage({ route }: { route: ScopeRoute }) {
  const tasks = useTasks();
  const projects = useProjects();
  const settings = useSettings();
  const wf = useWorkflow();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const project = route.name === "project" ? pm.get(route.id) : undefined;
  const { prefs, setPrefs, filter, setFilter } = useViewPrefs(routeKey(route), {
    view: route.name === "project" ? "board" : "list",
    groupBy: route.name === "tasks" ? "project" : "status",
  });

  const scope: Scope =
    route.name === "project" ? { kind: "project", id: route.id } : route.name === "inbox" ? { kind: "inbox" } : { kind: "all" };
  const today = todayIso();
  const scoped = useMemo(() => scopeTasks(tasks, scope, pm), [tasks, pm, route]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterTasks(scoped, filter, { today, projects: pm }), [scoped, filter, today, pm]);
  const visible = useMemo(
    () => sortTasks(prefs.showDone ? filtered : filtered.filter((t) => t.status !== "done"), prefs.sortBy),
    [filtered, prefs.showDone, prefs.sortBy],
  );
  const tags = useMemo(() => collectTags(scoped), [scoped]);

  // One project (or the Inbox) has one workflow, so its board columns are
  // its stages; "All tasks" mixes workflows and falls back to the 4 groups.
  const stages = useMemo(
    () => (route.name === "project" ? stagesFor(wf, route.id) : route.name === "inbox" ? wf.defaultStages : undefined),
    [wf, route],
  );
  const columns = useMemo<BoardColumn[]>(
    () =>
      stages
        ? stages.map((s) => ({ id: s.id, label: s.name, category: s.category, color: s.color, wipLimit: s.wipLimit }))
        : TASK_STATUSES.map((c) => ({ id: c, label: STATUS_META[c].label, category: c })),
    [stages],
  );
  const columnOf = useCallback((t: Task) => (stages ? resolveStage(t, stages).id : t.status), [stages]);
  const cardLabel = useCallback(
    (t: Task) => {
      const name = resolveStage(t, stagesFor(wf, t.projectId)).name;
      return name !== STATUS_META[t.status].label ? name : undefined;
    },
    [wf],
  );

  if (route.name === "project" && !project) {
    return (
      <>
        <PageHeader title="Không tìm thấy dự án" />
        <EmptyState
          icon={<FolderX size={18} />}
          title="Dự án này không còn tồn tại"
          hint="Có thể nó đã bị xoá. Task của dự án đã xoá nằm trong Inbox."
          action={<Button onClick={() => navigate({ name: "inbox" })}>Mở Inbox</Button>}
        />
      </>
    );
  }

  const defaults: Partial<TaskDraft> = project ? { projectId: project.id } : {};
  const add = (prefill: Partial<TaskDraft> = {}) => ui.openQuickAdd({ ...defaults, ...prefill });
  const open = scoped.filter((t) => t.status !== "done");
  const estimate = openEstimate(scoped);
  const multiProject = route.name !== "project";

  const title = project ? (
    <span className="flex items-center gap-2">
      <ProjectSwatch color={project.color} size={12} />
      {project.name}
      <span className="font-mono text-[11px] font-normal text-ink-faint">{project.key}</span>
    </span>
  ) : route.name === "inbox" ? (
    "Inbox"
  ) : (
    "Tất cả task"
  );

  return (
    <>
      <PageHeader
        title={title}
        icon={route.name === "inbox" ? <Inbox size={16} className="text-ink-faint" /> : route.name === "tasks" ? <Layers size={16} className="text-ink-faint" /> : null}
        actions={
          <>
            <span className="mr-2 hidden items-center gap-3 text-[12px] text-ink-faint md:flex">
              {project ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-[3px] rounded-full" style={{ backgroundColor: `var(--color-${project.area})` }} />
                  {AREA_META[project.area].label}
                </span>
              ) : null}
              <span className="font-mono tabular-nums">{open.length} đang mở</span>
              {estimate ? <span className="font-mono tabular-nums">{formatHours(estimate)} còn lại</span> : null}
            </span>
            {project ? (
              <ProjectActionsMenu project={project}>
                <IconButton aria-label="Tuỳ chọn dự án">
                  <MoreHorizontal size={16} />
                </IconButton>
              </ProjectActionsMenu>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => add()}>
              <Plus size={14} />
              <span className="hidden sm:inline">Tạo task</span>
            </Button>
          </>
        }
      />
      <FilterBar prefs={prefs} onPrefs={setPrefs} filter={filter} onFilter={setFilter} tags={tags} count={visible.length} />
      <div className="min-h-0 flex-1">
        {scoped.length === 0 ? (
          <EmptyState
            icon={route.name === "inbox" ? <Inbox size={18} /> : <Layers size={18} />}
            title={route.name === "inbox" ? "Inbox trống" : "Chưa có task nào"}
            hint={
              route.name === "inbox"
                ? "Việc chưa thuộc dự án nào sẽ nằm ở đây. Bấm C ở bất kỳ đâu để ghi nhanh một việc."
                : "Bấm C hoặc nút Tạo task. Gõ #tag !cao @mai ~2h ngay trong tiêu đề để điền nhanh."
            }
            action={
              <Button variant="primary" onClick={() => add()}>
                <Plus size={14} />
                Tạo task
              </Button>
            }
          />
        ) : prefs.view === "board" ? (
          <BoardView
            columns={columns}
            mode={stages ? "stage" : "category"}
            columnOf={columnOf}
            cardLabel={stages ? undefined : cardLabel}
            onEditStages={stages ? () => ui.editStages(project?.id ?? null) : undefined}
            tasks={visible}
            allTasks={tasks}
            projects={pm}
            showProject={multiProject}
            sortable={prefs.sortBy === "manual"}
            archiveDays={settings.archiveDays}
            onAdd={(column) => add(stages ? { stageId: column.id, status: column.category } : { status: column.category })}
          />
        ) : prefs.view === "list" ? (
          <ListView
            tasks={visible}
            allTasks={tasks}
            groupBy={prefs.groupBy}
            projects={projects}
            projectMap={pm}
            showProject={multiProject}
            stages={stages}
            onAdd={add}
          />
        ) : prefs.view === "calendar" ? (
          <CalendarView tasks={filtered} projects={pm} onCreateOn={(dueDate) => add({ dueDate })} />
        ) : (
          <TimelineView tasks={filtered} projects={projects} projectMap={pm} groupByProject={multiProject} />
        )}
      </div>
    </>
  );
}

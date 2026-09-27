import {
  Archive,
  BarChart3,
  Bookmark,
  CalendarCheck2,
  Inbox,
  Layers,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  SquarePen,
  Timer,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ProjectActionsMenu } from "../../features/projects/project-actions-menu";
import { AREAS, AREA_META, type Area, type Project } from "../../features/projects/project-types";
import { useProjects } from "../../features/projects/project-store";
import { ProjectSwatch } from "../../features/tasks/components/task-icons";
import { useTasks } from "../../features/tasks/task-store";
import { cn } from "../../lib/cn";
import { todayIso } from "../../lib/date";
import { navigate, sameRoute, useRoute, type Route } from "../../lib/router";
import { useSettings } from "../../lib/use-settings";
import { IconButton } from "../ui/icon-button";
import { MOD_KEY } from "../../lib/keyboard";
import { Kbd } from "../ui/kbd";
import { FocusStatus } from "./focus-status";
import { ui } from "./ui-store";

/** Workspace navigation: views on top, projects by area, then the tools. */
export function Sidebar({ className }: { className?: string }) {
  const settings = useSettings();
  const tasks = useTasks();
  const projects = useProjects();
  const { route } = useRoute();
  const [showArchived, setShowArchived] = useState(false);

  const counts = useMemo(() => {
    const today = todayIso();
    const byProject = new Map<string, number>();
    const known = new Set(projects.map((p) => p.id));
    let inbox = 0;
    let dueNow = 0;
    for (const t of tasks) {
      if (t.status === "done") continue;
      byProject.set(t.projectId, (byProject.get(t.projectId) ?? 0) + 1);
      if (!known.has(t.projectId)) inbox++;
      if (t.dueDate && t.dueDate <= today) dueNow++;
    }
    return { byProject, inbox, dueNow };
  }, [tasks, projects]);

  const archived = projects.filter((p) => p.archived);
  const go = (r: Route) => {
    navigate(r);
    ui.setMobileNav(false);
  };
  const isActive = (r: Route) => sameRoute(route, r);

  return (
    <nav aria-label="Điều hướng" className={cn("flex h-full flex-col gap-4 px-2.5 pb-3 pt-3", className)}>
      <div className="flex items-center gap-2 px-1.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-btn font-display text-[12px] font-bold text-btn-ink">
          {(settings.boardTitle.trim()[0] ?? "P").toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold tracking-tight">
          {settings.boardTitle || "Personal Tracker"}
        </span>
        <IconButton size="sm" aria-label="Cài đặt" onClick={ui.openSettings}>
          <Settings size={15} />
        </IconButton>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={ui.openPalette}
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface/70 px-2.5 text-[12.5px] text-ink-faint transition-colors hover:bg-surface hover:text-ink-soft"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 truncate text-left">Tìm hoặc chạy lệnh</span>
          <Kbd>{MOD_KEY}K</Kbd>
        </button>
        <IconButton variant="solid" aria-label="Tạo task" shortcut="C" onClick={() => ui.openQuickAdd()}>
          <SquarePen size={15} />
        </IconButton>
      </div>

      <div className="space-y-px">
        <NavItem icon={<CalendarCheck2 size={15} />} label="Hôm nay" count={counts.dueNow} active={isActive({ name: "today" })} onClick={() => go({ name: "today" })} />
        <NavItem icon={<Inbox size={15} />} label="Inbox" count={counts.inbox} active={isActive({ name: "inbox" })} onClick={() => go({ name: "inbox" })} />
        <NavItem icon={<Layers size={15} />} label="Tất cả task" active={isActive({ name: "tasks" })} onClick={() => go({ name: "tasks" })} />
        <NavItem icon={<BarChart3 size={15} />} label="Insights" active={isActive({ name: "insights" })} onClick={() => go({ name: "insights" })} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {AREAS.map((area) => (
          <AreaSection
            key={area}
            area={area}
            projects={projects.filter((p) => p.area === area && !p.archived)}
            counts={counts.byProject}
            route={route}
            onGo={go}
          />
        ))}

        {archived.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex h-6 w-full items-center gap-1.5 px-2 text-[11.5px] font-medium text-ink-faint hover:text-ink-soft"
            >
              <Archive size={12} />
              Đã lưu trữ ({archived.length})
            </button>
            {showArchived
              ? archived.map((p) => (
                  <ProjectItem key={p.id} project={p} count={counts.byProject.get(p.id) ?? 0} active={isActive({ name: "project", id: p.id })} onGo={go} />
                ))
              : null}
          </div>
        ) : null}

        <div className="space-y-px">
          <NavItem icon={<NotebookPen size={15} />} label="Ghi chú" active={route.name === "notes"} onClick={() => go({ name: "notes" })} />
          <NavItem icon={<Timer size={15} />} label="Focus & thói quen" active={isActive({ name: "focus" })} onClick={() => go({ name: "focus" })} />
          <NavItem icon={<Bookmark size={15} />} label="Liên kết" active={isActive({ name: "links" })} onClick={() => go({ name: "links" })} />
        </div>
      </div>

      <FocusStatus />
    </nav>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex h-7 items-center rounded-[6px] transition-colors",
        active ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:bg-surface-hover/70 hover:text-ink",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-[13px] font-medium"
      >
        <span className={cn("grid w-4 shrink-0 place-items-center", active ? "text-ink" : "text-ink-faint")}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count ? (
          <span className={cn("font-mono text-[11px] tabular-nums text-ink-faint", trailing && "group-hover:invisible")}>
            {count}
          </span>
        ) : null}
      </button>
      {trailing}
    </div>
  );
}

function AreaSection({
  area,
  projects,
  counts,
  route,
  onGo,
}: {
  area: Area;
  projects: Project[];
  counts: Map<string, number>;
  route: Route;
  onGo: (r: Route) => void;
}) {
  const meta = AREA_META[area];
  return (
    <section>
      <div className="group mb-0.5 flex h-6 items-center gap-2 px-2">
        <span aria-hidden className="h-2.5 w-[3px] rounded-full" style={{ backgroundColor: `var(--color-${area})` }} />
        <h2 className="flex-1 text-[11.5px] font-semibold text-ink-faint">{meta.label}</h2>
        <IconButton size="sm" aria-label={`Thêm dự án ${meta.label.toLowerCase()}`} onClick={() => ui.newProject(area)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
          <Plus size={13} />
        </IconButton>
      </div>
      {projects.length === 0 ? (
        <button
          type="button"
          onClick={() => ui.newProject(area)}
          className="flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-[12.5px] text-ink-faint hover:bg-surface-hover/70 hover:text-ink-soft"
        >
          <Plus size={13} />
          Thêm dự án
        </button>
      ) : (
        <div className="space-y-px">
          {projects.map((p) => (
            <ProjectItem
              key={p.id}
              project={p}
              count={counts.get(p.id) ?? 0}
              active={route.name === "project" && route.id === p.id}
              onGo={onGo}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectItem({
  project,
  count,
  active,
  onGo,
}: {
  project: Project;
  count: number;
  active: boolean;
  onGo: (r: Route) => void;
}) {
  return (
    <NavItem
      icon={<ProjectSwatch color={project.color} />}
      label={project.name}
      count={count}
      active={active}
      onClick={() => onGo({ name: "project", id: project.id })}
      trailing={
        <ProjectActionsMenu project={project} side="right">
          <button
            type="button"
            aria-label={`Tuỳ chọn dự án ${project.name}`}
            className="absolute right-1 grid h-5 w-5 place-items-center rounded-[4px] text-ink-faint opacity-0 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
        </ProjectActionsMenu>
      }
    />
  );
}

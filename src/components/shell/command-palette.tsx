import { Command } from "cmdk";
import {
  BarChart3,
  Bookmark,
  CalendarCheck2,
  Download,
  FolderPlus,
  Inbox,
  Layers,
  Moon,
  NotebookPen,
  Pause,
  Play,
  Search,
  Settings,
  SquarePen,
  Sun,
  Timer,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { focusActions, useFocus } from "../../features/focus/focus-store";
import { noteActions, useNotes } from "../../features/notes/note-store";
import { noteTitle, sortNotes } from "../../features/notes/note-types";
import { useProjects } from "../../features/projects/project-store";
import { ProjectSwatch, StatusIcon } from "../../features/tasks/components/task-icons";
import { projectMap, taskKey } from "../../features/tasks/task-selectors";
import { useTasks } from "../../features/tasks/task-store";
import { downloadBackup } from "../../features/workspace/backup";
import { autoBackupActions } from "../../features/auto-backup/auto-backup-service";
import { isDarkTheme } from "../../lib/settings";
import { matchesQuery } from "../../lib/text";
import { navigate, openTask, type Route } from "../../lib/router";
import { updateSettings, useSettings } from "../../lib/use-settings";
import { Kbd } from "../ui/kbd";
import { Modal } from "../ui/modal";
import { ui, useUi } from "./ui-store";

const itemClass =
  "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[7px] px-2.5 text-[13px] text-ink outline-none data-[selected=true]:bg-surface-hover";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-faint";

/** ⌘K: jump to any task, project, note or page, or run an action. */
export function CommandPalette() {
  const { palette } = useUi();
  const [query, setQuery] = useState("");
  const close = () => {
    ui.closePalette();
    setQuery("");
  };

  return (
    <Modal open={palette} onClose={close} title={null} top size="md">
      <Command
        label="Tìm hoặc chạy lệnh"
        loop
        filter={(value, search, keywords) => (matchesQuery(`${value} ${(keywords ?? []).join(" ")}`, search) ? 1 : 0)}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-ink-faint" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Tìm task, dự án, ghi chú… hoặc gõ lệnh"
            className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
          />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="max-h-[min(460px,60vh)] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-faint">
            Không tìm thấy "{query}". Thử tìm theo mã task (vd: WEB-12) hoặc tên không dấu.
          </Command.Empty>
          <PaletteItems query={query} onDone={close} />
        </Command.List>
      </Command>
    </Modal>
  );
}

function PaletteItems({ query, onDone }: { query: string; onDone: () => void }) {
  const tasks = useTasks();
  const projects = useProjects();
  const notes = useNotes();
  const focus = useFocus();
  const settings = useSettings();
  const pm = useMemo(() => projectMap(projects), [projects]);
  const searching = query.trim().length > 0;

  const taskList = useMemo(() => {
    if (!searching) return [...tasks].filter((t) => t.status !== "done").sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
    return tasks.filter((t) => matchesQuery(`${taskKey(t, pm)} ${t.title} ${t.tags.join(" ")}`, query)).slice(0, 30);
  }, [tasks, pm, query, searching]);

  const run = (fn: () => void) => () => {
    onDone();
    fn();
  };
  const go = (r: Route) => run(() => navigate(r));
  const dark = isDarkTheme(settings.theme);

  return (
    <>
      <Command.Group heading={searching ? "Task" : "Task gần đây"} className={groupClass}>
        {taskList.map((t) => (
          <Item key={t.id} value={`task ${t.id}`} keywords={[taskKey(t, pm), t.title, ...t.tags]} onSelect={run(() => openTask(t.id))} icon={<StatusIcon status={t.status} />}>
            <span className="w-16 shrink-0 whitespace-nowrap font-mono text-[11px] text-ink-faint">{taskKey(t, pm)}</span>
            <span className="truncate">{t.title}</span>
          </Item>
        ))}
      </Command.Group>

      <Command.Group heading="Tạo mới" className={groupClass}>
        <Item value="tao task moi" keywords={["create", "new task", "them"]} onSelect={run(() => ui.openQuickAdd())} icon={<SquarePen size={15} />} shortcut="C">
          Tạo task
        </Item>
        <Item value="tao du an moi" keywords={["project", "new"]} onSelect={run(() => ui.newProject())} icon={<FolderPlus size={15} />}>
          Tạo dự án
        </Item>
        <Item
          value="tao ghi chu moi"
          keywords={["note", "trang"]}
          onSelect={run(() => {
            const note = noteActions.add();
            navigate({ name: "notes", id: note.id });
          })}
          icon={<NotebookPen size={15} />}
        >
          Tạo ghi chú
        </Item>
      </Command.Group>

      <Command.Group heading="Đi tới" className={groupClass}>
        <Item value="hom nay" keywords={["today"]} onSelect={go({ name: "today" })} icon={<CalendarCheck2 size={15} />} shortcut="G H">Hôm nay</Item>
        <Item value="inbox" onSelect={go({ name: "inbox" })} icon={<Inbox size={15} />} shortcut="G I">Inbox</Item>
        <Item value="tat ca task" keywords={["all tasks"]} onSelect={go({ name: "tasks" })} icon={<Layers size={15} />} shortcut="G A">Tất cả task</Item>
        <Item value="insights bao cao" keywords={["report", "thong ke"]} onSelect={go({ name: "insights" })} icon={<BarChart3 size={15} />} shortcut="G R">Insights</Item>
        <Item value="ghi chu" keywords={["notes"]} onSelect={go({ name: "notes" })} icon={<NotebookPen size={15} />} shortcut="G N">Ghi chú</Item>
        <Item value="focus thoi quen pomodoro" keywords={["habit"]} onSelect={go({ name: "focus" })} icon={<Timer size={15} />} shortcut="G F">Focus & thói quen</Item>
        <Item value="lien ket bookmark" keywords={["links"]} onSelect={go({ name: "links" })} icon={<Bookmark size={15} />} shortcut="G L">Liên kết</Item>
      </Command.Group>

      {projects.length ? (
        <Command.Group heading="Dự án" className={groupClass}>
          {projects.map((p) => (
            <Item key={p.id} value={`project ${p.id}`} keywords={[p.name, p.key, "du an"]} onSelect={go({ name: "project", id: p.id })} icon={<ProjectSwatch color={p.color} />}>
              <span className="truncate">{p.name}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-faint">{p.key}</span>
            </Item>
          ))}
        </Command.Group>
      ) : null}

      {searching && notes.length ? (
        <Command.Group heading="Ghi chú" className={groupClass}>
          {sortNotes(notes).map((n) => (
            <Item key={n.id} value={`note ${n.id}`} keywords={[noteTitle(n), n.content.slice(0, 400)]} onSelect={go({ name: "notes", id: n.id })} icon={<NotebookPen size={15} />}>
              <span className="truncate">{noteTitle(n)}</span>
            </Item>
          ))}
        </Command.Group>
      ) : null}

      <Command.Group heading="Hành động" className={groupClass}>
        <Item value="focus bat dau tam dung pomodoro" keywords={["start", "pause", "timer"]} onSelect={run(focusActions.toggle)} icon={focus.running ? <Pause size={15} /> : <Play size={15} />}>
          {focus.running ? "Tạm dừng Focus" : "Bắt đầu Focus"}
        </Item>
        <Item value="doi giao dien sang toi" keywords={["theme", "dark", "light"]} onSelect={run(() => updateSettings({ theme: dark ? "light" : "dark" }))} icon={dark ? <Sun size={15} /> : <Moon size={15} />}>
          {dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
        </Item>
        <Item value="tuy chinh stage workflow" keywords={["stage", "column", "cot", "quy trinh"]} onSelect={run(() => ui.editStages(routeProjectId()))} icon={<Settings size={15} />}>
          Tuỳ chỉnh stage{routeProjectId() ? " của dự án này" : " (mặc định)"}
        </Item>
        <Item value="cai dat" keywords={["settings"]} onSelect={run(() => ui.openSettings())} icon={<Settings size={15} />}>
          Mở cài đặt
        </Item>
        <Item value="xuat du lieu sao luu" keywords={["export", "backup", "json"]} onSelect={run(() => {
            downloadBackup();
            autoBackupActions.markExported();
          })} icon={<Download size={15} />}>
          Xuất bản sao lưu JSON
        </Item>
      </Command.Group>
    </>
  );
}

/** Project id of the page behind the palette, if it is a project page. */
function routeProjectId(): string | null {
  const m = /^#\/project\/([^?]+)/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

function Item({
  value,
  keywords,
  onSelect,
  icon,
  shortcut,
  children,
}: {
  value: string;
  keywords?: string[];
  onSelect: () => void;
  icon: ReactNode;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <Command.Item value={value} keywords={keywords} onSelect={onSelect} className={itemClass}>
      <span className="grid w-4 shrink-0 place-items-center text-ink-faint">{icon}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {shortcut ? (
        <span className="flex gap-1">
          {shortcut.split(" ").map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      ) : null}
    </Command.Item>
  );
}

import { ArrowLeft, Eye, Inbox, NotebookPen, PencilLine, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "../components/shell/page-header";
import { Button } from "../components/ui/button";
import { IconButton } from "../components/ui/icon-button";
import { Markdown } from "../components/ui/markdown";
import { noteActions, useNotes } from "../features/notes/note-store";
import { noteTitle, sortNotes, type Note } from "../features/notes/note-types";
import { useProjects } from "../features/projects/project-store";
import { ProjectSwatch } from "../features/tasks/components/task-icons";
import { ProjectMenu } from "../features/tasks/components/task-pickers";
import { cn } from "../lib/cn";
import { formatRelativeTime } from "../lib/date";
import { navigate } from "../lib/router";
import { matchesQuery } from "../lib/text";

/** Notion-style pages: a list on the left, a Markdown page on the right. */
export function NotesPage({ noteId }: { noteId?: string }) {
  const notes = useNotes();
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => sortNotes(notes), [notes]);
  const visible = useMemo(
    () => sorted.filter((n) => matchesQuery(`${noteTitle(n)} ${n.content}`, query)),
    [sorted, query],
  );
  const current = notes.find((n) => n.id === noteId) ?? (noteId ? undefined : sorted[0]);

  function create() {
    const note = noteActions.add();
    navigate({ name: "notes", id: note.id });
  }

  return (
    <>
      <PageHeader
        title="Ghi chú"
        icon={<NotebookPen size={16} className="text-ink-faint" />}
        actions={
          <Button variant="primary" size="sm" onClick={create}>
            <Plus size={14} />
            <span className="hidden sm:inline">Trang mới</span>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className={cn("w-full shrink-0 flex-col border-r border-line md:flex md:w-[260px]", current && noteId ? "hidden" : "flex")}>
          <label className="relative m-2">
            <span className="sr-only">Tìm ghi chú</span>
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trong ghi chú…"
              className="h-8 w-full rounded-[var(--radius-control)] border border-line bg-surface pl-7 pr-2 text-[12.5px] outline-none placeholder:text-ink-faint focus:border-line-strong"
            />
          </label>
          <ul className="min-h-0 flex-1 space-y-px overflow-y-auto px-2 pb-3">
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => navigate({ name: "notes", id: n.id })}
                  aria-current={current?.id === n.id ? "page" : undefined}
                  className={cn(
                    "w-full rounded-[7px] px-2.5 py-2 text-left transition-colors",
                    current?.id === n.id ? "bg-surface-muted" : "hover:bg-surface-muted/60",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {n.pinned ? <Pin size={11} className="shrink-0 text-ink-faint" /> : null}
                    <span className="truncate text-[13px] font-medium text-ink">{noteTitle(n)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-ink-faint">
                    {formatRelativeTime(n.updatedAt)} · {snippet(n)}
                  </span>
                </button>
              </li>
            ))}
            {!visible.length ? <li className="px-2.5 py-3 text-[12.5px] text-ink-faint">{query ? "Không tìm thấy ghi chú nào." : "Chưa có trang nào."}</li> : null}
          </ul>
        </aside>

        <div className={cn("min-w-0 flex-1", !(current && noteId) && "hidden md:block")}>
          {current ? (
            <NoteEditor key={current.id} note={current} />
          ) : (
            <EmptyState
              icon={<NotebookPen size={18} />}
              title={noteId ? "Không tìm thấy trang này" : "Chưa có ghi chú"}
              hint="Ghi chú hỗ trợ Markdown: tiêu đề, danh sách, - [ ] việc cần làm, bảng. Có thể gắn trang vào một dự án."
              action={
                <Button variant="primary" onClick={create}>
                  <Plus size={14} />
                  Tạo trang đầu tiên
                </Button>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

function snippet(n: Note): string {
  const body = n.content.replace(/^#.*$/m, "").replace(/[#*_`>|-]/g, " ").replace(/\s+/g, " ").trim();
  return body.slice(0, 80) || "Trống";
}

function NoteEditor({ note }: { note: Note }) {
  const projects = useProjects();
  const project = projects.find((p) => p.id === note.projectId);
  const [mode, setMode] = useState<"edit" | "view">(note.content.trim() ? "view" : "edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 320)}px`;
  }, [note.content, mode]);

  function remove() {
    const removed = noteActions.remove(note.id);
    navigate({ name: "notes" });
    if (removed) {
      toast(`Đã xoá "${noteTitle(note)}"`, {
        action: { label: "Hoàn tác", onClick: () => noteActions.restore(removed.note, removed.index) },
      });
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 flex h-11 items-center gap-1 border-b border-line bg-surface/95 px-2 backdrop-blur sm:px-4">
        <IconButton className="md:hidden" aria-label="Về danh sách" onClick={() => navigate({ name: "notes" })}>
          <ArrowLeft size={16} />
        </IconButton>
        <ProjectMenu value={note.projectId} onChange={(projectId) => noteActions.update(note.id, { projectId })} projects={projects}>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] text-ink-soft hover:bg-surface-hover">
            {project ? <ProjectSwatch color={project.color} /> : <Inbox size={13} className="text-ink-faint" />}
            {project?.name ?? "Không gắn dự án"}
          </button>
        </ProjectMenu>
        <span className="ml-2 hidden text-[11.5px] text-ink-faint sm:inline">Sửa {formatRelativeTime(note.updatedAt)}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-[var(--radius-control)] bg-surface-muted p-0.5">
            <button type="button" onClick={() => setMode("view")} aria-pressed={mode === "view"} className={cn("flex h-6 items-center gap-1 rounded-[5px] px-2 text-[12px]", mode === "view" ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft")}>
              <Eye size={12} /> Xem
            </button>
            <button type="button" onClick={() => setMode("edit")} aria-pressed={mode === "edit"} className={cn("flex h-6 items-center gap-1 rounded-[5px] px-2 text-[12px]", mode === "edit" ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft")}>
              <PencilLine size={12} /> Sửa
            </button>
          </div>
          <IconButton aria-label={note.pinned ? "Bỏ ghim" : "Ghim lên đầu"} onClick={() => noteActions.update(note.id, { pinned: !note.pinned })}>
            {note.pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </IconButton>
          <IconButton aria-label="Xoá trang" onClick={remove} className="hover:text-danger">
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <article className="mx-auto max-w-[760px] px-5 pb-24 pt-8 sm:px-10">
        <input
          value={note.title}
          onChange={(e) => noteActions.update(note.id, { title: e.target.value })}
          placeholder="Trang chưa đặt tên"
          aria-label="Tiêu đề trang"
          className="w-full bg-transparent font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink outline-none placeholder:text-ink-faint/60"
        />
        <div className="mt-5">
          {mode === "edit" ? (
            <textarea
              ref={bodyRef}
              autoFocus={!note.content}
              value={note.content}
              onChange={(e) => noteActions.update(note.id, { content: e.target.value })}
              placeholder={"Bắt đầu viết… Markdown được hỗ trợ:\n## Tiêu đề\n- danh sách\n- [ ] việc cần làm\n**đậm**, `code`, | bảng |"}
              aria-label="Nội dung trang"
              className="block min-h-[320px] w-full resize-none bg-transparent font-mono text-[13px] leading-[1.75] text-ink outline-none placeholder:text-ink-faint"
            />
          ) : note.content.trim() ? (
            <div onDoubleClick={() => setMode("edit")}>
              <Markdown className="text-[14.5px]">{note.content}</Markdown>
            </div>
          ) : (
            <button type="button" onClick={() => setMode("edit")} className="text-[14px] text-ink-faint hover:text-ink-soft">
              Trang trống — bấm để viết.
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

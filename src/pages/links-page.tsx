import { Bookmark as BookmarkIcon, Plus, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "../components/shell/page-header";
import { Button } from "../components/ui/button";
import { useConfirm } from "../components/ui/confirm-dialog";
import { IconButton } from "../components/ui/icon-button";
import { BookmarkDialog } from "../features/bookmarks/bookmark-dialog";
import { GroupManagerDialog } from "../features/bookmarks/group-manager-dialog";
import { useBookmarks, type Bookmark } from "../features/bookmarks/use-bookmarks";
import { faviconUrl, hostname } from "../lib/url";

/** Bookmarks grouped into tiles — the tools and sites you open every day. */
export function LinksPage() {
  const { bookmarks, groups, addGroup, addBookmark, removeBookmark, removeGroup, renameGroup } = useBookmarks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupMgrOpen, setGroupMgrOpen] = useState(false);
  const confirm = useConfirm();

  const sections = useMemo(() => {
    const out = groups.map((g) => ({ name: g, items: bookmarks.filter((b) => b.group === g) }));
    const loose = bookmarks.filter((b) => !b.group || !groups.includes(b.group));
    if (loose.length) out.push({ name: "", items: loose });
    return out.filter((s) => s.items.length);
  }, [bookmarks, groups]);

  async function handleRemoveGroup(name: string) {
    const ok = await confirm({
      title: `Xoá nhóm "${name}"?`,
      message: "Liên kết trong nhóm sẽ chuyển về mục Khác, không bị xoá.",
      confirmLabel: "Xoá nhóm",
      danger: true,
    });
    if (ok) removeGroup(name);
  }

  function remove(b: Bookmark) {
    removeBookmark(b.id);
    toast(`Đã xoá ${b.title}`, { action: { label: "Hoàn tác", onClick: () => addBookmark(b) } });
  }

  return (
    <>
      <PageHeader
        title="Liên kết"
        icon={<BookmarkIcon size={16} className="text-ink-faint" />}
        actions={
          <>
            <IconButton aria-label="Quản lý nhóm" onClick={() => setGroupMgrOpen(true)}>
              <Settings2 size={16} />
            </IconButton>
            <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus size={14} />
              <span className="hidden sm:inline">Thêm liên kết</span>
            </Button>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <EmptyState
            icon={<BookmarkIcon size={18} />}
            title="Chưa có liên kết nào"
            hint="Dán đường dẫn, tiêu đề trang sẽ được tự lấy. Gom theo nhóm như Hằng ngày, Công việc."
            action={
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus size={14} />
                Thêm liên kết
              </Button>
            }
          />
        ) : (
          <div className="mx-auto max-w-[1100px] space-y-7 px-4 py-6 sm:px-8">
            {sections.map((s) => (
              <section key={s.name || "_"}>
                <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                  {s.name || "Khác"}
                  <span className="font-mono text-[11px] font-normal text-ink-faint">{s.items.length}</span>
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {s.items.map((b) => (
                    <li key={b.id} className="group relative">
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-14 items-center gap-3 rounded-[10px] border border-line px-3 transition-colors hover:border-line-strong hover:bg-surface-muted/50"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-surface-muted">
                          <img
                            src={faviconUrl(b.url)}
                            alt=""
                            width={18}
                            height={18}
                            className="h-[18px] w-[18px] rounded-[3px]"
                            onError={(e) => {
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        </span>
                        <span className="min-w-0 flex-1 pr-6">
                          <span className="block truncate text-[13px] font-medium text-ink">{b.title}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-faint">{hostname(b.url)}</span>
                        </span>
                      </a>
                      <IconButton
                        size="sm"
                        aria-label={`Xoá ${b.title}`}
                        onClick={() => remove(b)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <BookmarkDialog open={dialogOpen} groups={groups} onClose={() => setDialogOpen(false)} onSubmit={addBookmark} />
      <GroupManagerDialog
        open={groupMgrOpen}
        groups={groups}
        onClose={() => setGroupMgrOpen(false)}
        onAdd={addGroup}
        onRename={renameGroup}
        onRemove={handleRemoveGroup}
      />
    </>
  );
}

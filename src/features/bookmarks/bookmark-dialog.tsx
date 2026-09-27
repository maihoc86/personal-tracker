import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { FieldLabel, TextField } from "../../components/ui/form-controls";
import { isSubmitEnter } from "../../lib/keyboard";
import { Modal } from "../../components/ui/modal";
import { fetchPageTitle } from "../../lib/fetch-title";
import { normalizeUrl, tidyTitle } from "../../lib/url";
import { GroupPicker } from "./group-picker";
import type { BookmarkDraft } from "./use-bookmarks";

type BookmarkDialogProps = {
  open: boolean;
  groups: string[];
  onClose: () => void;
  onSubmit: (draft: BookmarkDraft) => void;
};

const EMPTY: BookmarkDraft = { url: "", title: "", group: "" };

export function BookmarkDialog({
  open,
  groups,
  onClose,
  onSubmit,
}: BookmarkDialogProps) {
  const [draft, setDraft] = useState<BookmarkDraft>(EMPTY);
  const [loadingTitle, setLoadingTitle] = useState(false);
  // Stop auto-fill once the user types their own title.
  const titleEdited = useRef(false);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      titleEdited.current = false;
      setLoadingTitle(false);
    }
  }, [open]);

  // Debounced auto-fetch of the page title whenever the URL settles.
  useEffect(() => {
    const url = normalizeUrl(draft.url);
    if (!open || !url || titleEdited.current || !/\.\w{2,}/.test(draft.url)) {
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingTitle(true);
      const title = await fetchPageTitle(url, ctrl.signal);
      setLoadingTitle(false);
      if (title && !titleEdited.current) {
        setDraft((d) => ({ ...d, title: tidyTitle(title) }));
      }
    }, 700);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [draft.url, open]);

  function submit() {
    if (!draft.url.trim()) return;
    onSubmit(draft);
    onClose();
  }

  return (
    <Modal open={open} title="Lưu liên kết" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <FieldLabel>Đường dẫn</FieldLabel>
          <TextField
            autoFocus
            placeholder="vd: github.com hoặc https://..."
            value={draft.url}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            onKeyDown={(e) => isSubmitEnter(e) && submit()}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Tiêu đề</FieldLabel>
            {loadingTitle ? (
              <span className="mb-1.5 flex items-center gap-1 text-[11.5px] text-ink-faint">
                <Loader2 size={12} className="animate-spin" />
                Đang lấy tiêu đề
              </span>
            ) : null}
          </div>
          <TextField
            placeholder="Tên hiển thị"
            value={draft.title}
            onChange={(e) => {
              titleEdited.current = true;
              setDraft((d) => ({ ...d, title: e.target.value }));
            }}
          />
        </div>
        <div>
          <FieldLabel>Nhóm</FieldLabel>
          <GroupPicker
            groups={groups}
            value={draft.group}
            onChange={(group) => setDraft((d) => ({ ...d, group }))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" onClick={submit} disabled={!draft.url.trim()}>
            Lưu liên kết
          </Button>
        </div>
      </div>
    </Modal>
  );
}

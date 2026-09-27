import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { TextField } from "../../components/ui/form-controls";
import { isSubmitEnter } from "../../lib/keyboard";
import { IconButton } from "../../components/ui/icon-button";
import { Modal } from "../../components/ui/modal";

type GroupManagerDialogProps = {
  open: boolean;
  groups: string[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onRemove: (name: string) => void;
};

/** Manage the bookmark group list: add, rename inline, delete. */
export function GroupManagerDialog({
  open,
  groups,
  onClose,
  onAdd,
  onRename,
  onRemove,
}: GroupManagerDialogProps) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(name: string) {
    setEditing(name);
    setDraft(name);
  }

  function commitEdit() {
    if (editing) onRename(editing, draft);
    setEditing(null);
  }

  function addGroup() {
    const clean = newName.trim();
    if (!clean) return;
    onAdd(clean);
    setNewName("");
  }

  return (
    <Modal open={open} title="Quản lý nhóm liên kết" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          {groups.length === 0 ? (
            <p className="py-2 text-center text-[13px] text-ink-faint">
              Chưa có nhóm nào. Thêm nhóm đầu tiên bên dưới.
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g}
                className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line px-3"
              >
                {editing === g ? (
                  <>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (isSubmitEnter(e)) commitEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none"
                    />
                    <IconButton
                      aria-label="Lưu tên"
                      onClick={commitEdit}
                      className="h-7 w-7"
                    >
                      <Check size={15} />
                    </IconButton>
                    <IconButton
                      aria-label="Huỷ"
                      onClick={() => setEditing(null)}
                      className="h-7 w-7"
                    >
                      <X size={15} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      title="Đổi tên nhóm"
                      className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-ink"
                    >
                      {g}
                    </button>
                    <IconButton
                      aria-label="Xoá nhóm"
                      onClick={() => onRemove(g)}
                      className="h-7 w-7 text-ink-faint hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line pt-4">
          <TextField
            placeholder="Tên nhóm mới"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => isSubmitEnter(e) && addGroup()}
          />
          <Button variant="primary" onClick={addGroup} className="h-9">
            <Plus size={14} />
            Thêm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

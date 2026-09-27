import { Download, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { doneOlderThan } from "../../features/tasks/task-selectors";
import { taskActions, useTasks } from "../../features/tasks/task-store";
import { downloadBackup, parseBackup, restoreBackup } from "../../features/workspace/backup";
import { clearData, createSampleData } from "../../features/workspace/sample-data";
import { PURGE_DAY_OPTIONS } from "../../lib/settings";
import { Button } from "../ui/button";
import { useConfirm } from "../ui/confirm-dialog";
import { FieldLabel } from "../ui/form-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Backup/restore, cleanup and demo data. */
export function DataControls() {
  const confirm = useConfirm();
  const tasks = useTasks();
  const [purgeDays, setPurgeDays] = useState(90);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("File quá lớn (tối đa 5 MB) — không phải bản sao lưu hợp lệ.");
      return;
    }
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const { data } = parsed;
    const ok = await confirm({
      title: "Khôi phục từ bản sao lưu?",
      message: `Bản sao lưu có ${data.tasks.length} task, ${data.projects.length} dự án, ${data.notes.length} ghi chú, ${data.habits.length} thói quen và ${data.bookmarks.length} liên kết. Toàn bộ dữ liệu hiện tại sẽ bị thay thế.`,
      confirmLabel: "Khôi phục",
      danger: true,
    });
    if (ok) restoreBackup(data);
  }

  async function handlePurge() {
    const old = doneOlderThan(tasks, purgeDays, Date.now());
    if (!old.length) {
      await confirm({ title: "Không có task để dọn", message: `Chưa có task đã xong nào cũ hơn ${purgeDays} ngày.`, confirmLabel: "Đóng", alert: true });
      return;
    }
    const ok = await confirm({
      title: `Xoá ${old.length} task đã xong?`,
      message: `Các task hoàn thành hơn ${purgeDays} ngày trước sẽ bị xoá vĩnh viễn. Nên xuất bản sao lưu trước.`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    taskActions.removeMany(old.map((t) => t.id));
    toast(`Đã xoá ${old.length} task cũ`);
  }

  async function handleClear() {
    const ok = await confirm({
      title: "Xoá toàn bộ dữ liệu?",
      message: "Tất cả task, dự án, ghi chú, thói quen và liên kết sẽ bị xoá. Cài đặt giao diện được giữ lại. Nên xuất bản sao lưu trước.",
      confirmLabel: "Xoá toàn bộ",
      danger: true,
    });
    if (ok) clearData();
  }

  async function handleSeed() {
    const ok = await confirm({
      title: "Tạo dữ liệu mẫu?",
      message: "Dữ liệu hiện có sẽ bị ghi đè bằng bộ dữ liệu mẫu (dự án công việc + cá nhân).",
      confirmLabel: "Tạo dữ liệu mẫu",
      danger: true,
    });
    if (ok) createSampleData();
  }

  return (
    <div className="space-y-6">
      <section>
        <FieldLabel>Sao lưu</FieldLabel>
        <p className="-mt-1 mb-2.5 text-[12px] leading-relaxed text-ink-faint">
          Dữ liệu chỉ nằm trong trình duyệt này. Xuất file JSON định kỳ để không mất khi xoá dữ liệu trình duyệt hoặc đổi máy.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => downloadBackup()}>
            <Download size={14} />
            Xuất JSON
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            Nhập từ file…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void handleImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section>
        <FieldLabel>Dọn task đã xong</FieldLabel>
        <div className="flex gap-2">
          <Select value={String(purgeDays)} onValueChange={(v) => setPurgeDays(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PURGE_DAY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  Cũ hơn {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePurge}>
            <Trash2 size={14} />
            Xoá vĩnh viễn
          </Button>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <FieldLabel>Làm lại từ đầu</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSeed}>
            <Sparkles size={14} />
            Tạo dữ liệu mẫu
          </Button>
          <Button onClick={handleClear} className="text-danger hover:bg-danger-soft">
            <Trash2 size={14} />
            Xoá toàn bộ dữ liệu
          </Button>
        </div>
      </section>
    </div>
  );
}

import { FolderSync, History, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { useConfirm } from "../../components/ui/confirm-dialog";
import { FieldLabel } from "../../components/ui/form-controls";
import { formatRelativeTime } from "../../lib/date";
import { KEEP_FOLDER_DAYS, KEEP_LOCAL_DAYS, type LocalSnapshot } from "./auto-backup-model";
import { autoBackupActions, isFolderBackupSupported, runBackup, useAutoBackup } from "./auto-backup-service";

/** Settings → Dữ liệu: folder auto-backup + in-browser snapshots. */
export function AutoBackupSection() {
  const { settings, permission } = useAutoBackup();
  const supported = isFolderBackupSupported();
  const [busy, setBusy] = useState(false);
  const paused = settings.enabled && permission !== "granted";

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <FieldLabel>Sao lưu tự động vào thư mục</FieldLabel>
        {!supported ? (
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Trình duyệt này chưa cho phép web ghi vào thư mục. Dùng Chrome hoặc Edge để bật, hoặc Xuất JSON thủ công bên dưới. Bản lưu trong trình duyệt vẫn tự chạy.
          </p>
        ) : (
          <div className="rounded-[10px] border border-line p-3">
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {settings.enabled ? (
                <>
                  Đang ghi vào thư mục <strong className="text-ink">{settings.folderName}</strong>
                  {settings.lastBackupAt ? ` · lần cuối ${formatRelativeTime(settings.lastBackupAt)}` : ""}. Giữ bản mới nhất và {KEEP_FOLDER_DAYS} bản theo ngày.
                </>
              ) : (
                <>Chọn một thư mục (nên nằm trong iCloud Drive / Google Drive / Dropbox) — app ghi bản sao lưu 1 phút sau mỗi lần thay đổi.</>
              )}
            </p>
            {paused ? (
              <p className="mt-2 text-[12.5px] text-warn">Trình duyệt cần bạn cho phép ghi lại vào thư mục (thường sau khi mở lại trình duyệt).</p>
            ) : null}
            {settings.enabled && settings.lastError && !paused ? (
              <p className="mt-2 text-[12.5px] text-danger">{settings.lastError}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {paused ? (
                <Button variant="primary" disabled={busy} onClick={() => act(async () => (await autoBackupActions.resume()) && toast("Đã tiếp tục sao lưu tự động"))}>
                  <FolderSync size={14} />
                  Cho phép ghi tiếp
                </Button>
              ) : null}
              {settings.enabled && !paused ? (
                <Button variant="primary" disabled={busy} onClick={() => act(async () => { await runBackup(); toast("Đã sao lưu"); })}>
                  <FolderSync size={14} />
                  Sao lưu ngay
                </Button>
              ) : null}
              <Button
                variant={settings.enabled ? "secondary" : "primary"}
                disabled={busy}
                onClick={() => act(async () => (await autoBackupActions.chooseFolder()) && toast("Đã bật sao lưu tự động"))}
              >
                {settings.enabled ? "Đổi thư mục…" : "Chọn thư mục…"}
              </Button>
              {settings.enabled ? (
                <Button variant="ghost" disabled={busy} onClick={() => act(autoBackupActions.disable)}>
                  Tắt
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <LocalSnapshots />
    </section>
  );
}

function LocalSnapshots() {
  const confirm = useConfirm();
  const [list, setList] = useState<LocalSnapshot[] | null>(null);

  useEffect(() => {
    void autoBackupActions.listSnapshots().then(setList);
  }, []);

  async function restore(s: LocalSnapshot) {
    const ok = await confirm({
      title: `Khôi phục bản ${s.day}?`,
      message: "Dữ liệu hiện tại sẽ được thay bằng bản này. Bản hiện tại được giữ lại thành một bản “trước khi thay dữ liệu”.",
      confirmLabel: "Khôi phục",
      danger: true,
    });
    if (!ok) return;
    const error = await autoBackupActions.restoreSnapshot(s);
    if (error) toast.error(error);
  }

  return (
    <div>
      <FieldLabel>Bản lưu trong trình duyệt</FieldLabel>
      <p className="-mt-1 mb-2 text-[12px] text-ink-faint">
        Tự giữ {KEEP_LOCAL_DAYS} ngày gần nhất và bản trước mỗi lần xoá/khôi phục — cứu nhanh khi lỡ tay, nhưng mất nếu xoá dữ liệu trình duyệt.
      </p>
      {list === null ? null : list.length === 0 ? (
        <p className="text-[12.5px] text-ink-faint">Chưa có bản nào — bản đầu tiên được tạo vài giây sau khi mở app.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[10px] border border-line">
          {list.map((s) => (
            <li key={s.day} className="flex h-10 items-center gap-2.5 px-3 text-[13px]">
              <History size={14} className="shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-ink">{s.day}</span>
              <span className="shrink-0 text-[11.5px] text-ink-faint">{formatRelativeTime(s.at)}</span>
              <Button size="sm" variant="ghost" onClick={() => restore(s)}>
                <RotateCcw size={13} />
                Khôi phục
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

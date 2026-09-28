import { AlertTriangle, CloudOff, ShieldAlert } from "lucide-react";
import { ui } from "../../components/shell/ui-store";
import { useNow } from "../focus/focus-store";
import { backupHealth } from "./auto-backup-model";
import { autoBackupActions, useAutoBackup } from "./auto-backup-service";

/** Sidebar nudge shown only when the data isn't safely copied somewhere. */
export function BackupStatus() {
  const { settings, permission } = useAutoBackup();
  const now = useNow(false);
  const health = backupHealth(settings, permission, now);
  if (health.kind === "ok") return null;

  const base = "flex w-full items-start gap-2 rounded-[10px] border px-2.5 py-2 text-left text-[12px] leading-snug transition-colors";
  if (health.kind === "paused") {
    return (
      <button type="button" onClick={() => void autoBackupActions.resume()} className={`${base} border-warn/40 bg-warn/10 text-ink hover:bg-warn/15`}>
        <CloudOff size={14} className="mt-px shrink-0 text-warn" />
        <span>Sao lưu tự động đang tạm dừng · <span className="font-medium underline underline-offset-2">Cho phép ghi tiếp</span></span>
      </button>
    );
  }
  if (health.kind === "error") {
    return (
      <button type="button" onClick={() => ui.openSettings("data")} className={`${base} border-danger/40 bg-danger-soft text-ink`}>
        <AlertTriangle size={14} className="mt-px shrink-0 text-danger" />
        <span>{health.message}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={() => ui.openSettings("data")} className={`${base} border-line bg-surface text-ink-soft hover:text-ink`}>
      <ShieldAlert size={14} className="mt-px shrink-0 text-warn" />
      <span>{health.since ? "Đã hơn 7 ngày chưa sao lưu ra ngoài trình duyệt" : "Dữ liệu chỉ nằm trong trình duyệt này"} · <span className="font-medium underline underline-offset-2">Bật sao lưu</span></span>
    </button>
  );
}

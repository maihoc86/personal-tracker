import { Database, Keyboard, Palette, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ARCHIVE_DAY_OPTIONS } from "../../lib/settings";
import { updateSettings, useSettings } from "../../lib/use-settings";
import { ui, useUi } from "../shell/ui-store";
import { FieldLabel, TextField } from "../ui/form-controls";
import { MOD_KEY } from "../../lib/keyboard";
import { Kbd } from "../ui/kbd";
import { Modal } from "../ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AppearanceControls } from "./appearance-controls";
import { DataControls } from "./data-controls";

type Tab = "general" | "appearance" | "data" | "shortcuts";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "general", label: "Chung", icon: <SlidersHorizontal size={14} /> },
  { id: "appearance", label: "Giao diện", icon: <Palette size={14} /> },
  { id: "data", label: "Dữ liệu", icon: <Database size={14} /> },
  { id: "shortcuts", label: "Phím tắt", icon: <Keyboard size={14} /> },
];

const SHORTCUTS: [string[], string][] = [
  [[MOD_KEY, "K"], "Tìm kiếm & lệnh"],
  [["C"], "Tạo task"],
  [["G", "H"], "Tới Hôm nay"],
  [["G", "I"], "Tới Inbox"],
  [["G", "A"], "Tới Tất cả task"],
  [["G", "R"], "Tới Insights"],
  [["G", "N"], "Tới Ghi chú"],
  [["G", "F"], "Tới Focus & thói quen"],
  [["G", "L"], "Tới Liên kết"],
  [["P"], "Bắt đầu / tạm dừng Focus"],
  [["Esc"], "Đóng panel / hộp thoại"],
  [[MOD_KEY, "Enter"], "Gửi bình luận / tạo task từ ô mô tả"],
  [["Space"], "Nhấc / thả thẻ trên Board (bàn phím)"],
];

export function SettingsModal() {
  const { settings: open } = useUi();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("general");
  // Fade the dialog while the colour picker is open so the change shows live.
  const [peek, setPeek] = useState(false);

  return (
    <Modal open={open} title="Cài đặt" onClose={ui.closeSettings} size="lg" peek={peek}>
      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <nav aria-label="Mục cài đặt" className="flex gap-1 overflow-x-auto sm:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-[6px] px-2.5 text-left text-[13px] font-medium transition-colors",
                tab === t.id ? "bg-surface-muted text-ink" : "text-ink-soft hover:bg-surface-muted/60 hover:text-ink",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[320px]">
          {tab === "general" ? (
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="ws-name">Tên không gian làm việc</FieldLabel>
                <TextField id="ws-name" value={settings.boardTitle} placeholder="vd: Không gian của Học" onChange={(e) => updateSettings({ boardTitle: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Tự ẩn task đã xong trên Board sau</FieldLabel>
                <Select value={String(settings.archiveDays)} onValueChange={(v) => updateSettings({ archiveDays: Number(v) })}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARCHIVE_DAY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[11.5px] text-ink-faint">Task vẫn được giữ, chỉ gập lại cuối cột Hoàn thành.</p>
              </div>
            </div>
          ) : tab === "appearance" ? (
            <AppearanceControls settings={settings} onUpdate={updateSettings} onPreview={setPeek} />
          ) : tab === "data" ? (
            <DataControls />
          ) : (
            <ul className="divide-y divide-line rounded-[10px] border border-line">
              {SHORTCUTS.map(([keys, label]) => (
                <li key={label} className="flex h-9 items-center justify-between px-3 text-[13px]">
                  <span className="text-ink-soft">{label}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

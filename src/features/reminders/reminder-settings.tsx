import { BellRing } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { FieldLabel } from "../../components/ui/form-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../tasks/components/filter-bar";
import { LEAD_OPTIONS, type Settings } from "../../lib/settings";
import { testReminder } from "./reminder-service";

const leadLabel = (m: number) => (m === 0 ? "Đúng giờ hạn" : m < 60 ? `Trước ${m} phút` : `Trước ${m / 60} giờ`);

/** Settings → "Nhắc việc & kế hoạch". */
export function ReminderSettings({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const r = settings.reminders;
  const setR = (p: Partial<Settings["reminders"]>) => onUpdate({ reminders: { ...r, ...p } });
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel htmlFor="capacity">Sức chứa mỗi ngày</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            id="capacity"
            type="number"
            min={1}
            max={16}
            step={0.5}
            value={settings.capacityHours}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n > 0 && n <= 24) onUpdate({ capacityHours: n });
            }}
            className="h-9 w-24 rounded-[var(--radius-control)] border border-line bg-surface px-3 font-mono text-[13px] outline-none focus:border-line-strong"
          />
          <span className="text-[12.5px] text-ink-soft">giờ làm việc tập trung — dùng để cảnh báo quá tải ở Kế hoạch hôm nay.</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
        <div>
          <p className="text-[13px] font-medium text-ink">Nhắc việc</p>
          <p className="text-[12px] text-ink-faint">Chỉ nhắc khi app đang mở (tab hoặc app đã cài) — chưa có máy chủ để gửi khi tắt hẳn.</p>
        </div>
        <Switch checked={r.enabled} onChange={(enabled) => setR({ enabled })} label="Bật nhắc việc" />
      </div>

      {r.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Task có giờ hạn</FieldLabel>
              <Select value={String(r.leadMinutes)} onValueChange={(v) => setR({ leadMinutes: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {leadLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="digest">Tóm tắt buổi sáng lúc</FieldLabel>
              <input
                id="digest"
                type="time"
                value={r.digestTime}
                onChange={(e) => setR({ digestTime: e.target.value })}
                className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 font-mono text-[13px] outline-none focus:border-line-strong"
              />
              <p className="mt-1 text-[11.5px] text-ink-faint">Xoá giờ để tắt tóm tắt.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line px-3 py-2.5">
            <span className="flex-1 text-[12.5px] text-ink-soft">
              {!supported
                ? "Trình duyệt không hỗ trợ thông báo hệ thống — nhắc chỉ hiện trong app."
                : permission === "granted"
                  ? "Thông báo hệ thống: đã cho phép."
                  : permission === "denied"
                    ? "Thông báo hệ thống đang bị chặn — mở lại trong cài đặt trang của trình duyệt."
                    : "Cho phép thông báo hệ thống để thấy nhắc cả khi đang ở cửa sổ khác."}
            </span>
            {supported && permission === "default" ? (
              <Button size="sm" variant="primary" onClick={() => void Notification.requestPermission().then(setPermission)}>
                Cho phép thông báo
              </Button>
            ) : null}
            <Button size="sm" onClick={testReminder}>
              <BellRing size={13} />
              Thử nhắc
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

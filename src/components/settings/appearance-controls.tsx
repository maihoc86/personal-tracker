import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { isCustomColor, PRIMARY_COLORS, type Settings, type ThemeMode } from "../../lib/settings";
import { ColorPickerPopover } from "../ui/color-picker";
import { FieldLabel } from "../ui/form-controls";
import { Tooltip } from "../ui/tooltip";

const RAINBOW =
  "conic-gradient(from 0deg, #e5484d, #f59e0b, #84cc16, #10b981, #0ea5e9, #6366f1, #d946ef, #e5484d)";

const THEMES: { id: ThemeMode; label: string; icon: ReactNode }[] = [
  { id: "light", label: "Sáng", icon: <Sun size={14} /> },
  { id: "dark", label: "Tối", icon: <Moon size={14} /> },
  { id: "system", label: "Theo hệ thống", icon: <Monitor size={14} /> },
];

type AppearanceControlsProps = {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  /** True while the colour picker is open, so the dialog can fade for a live preview. */
  onPreview?: (active: boolean) => void;
};

/** Theme mode and accent colour. */
export function AppearanceControls({ settings, onUpdate, onPreview }: AppearanceControlsProps) {
  const custom = isCustomColor(settings.primary, PRIMARY_COLORS);
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Giao diện</FieldLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={settings.theme === t.id}
              onClick={() => onUpdate({ theme: t.id })}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] border text-[12.5px] font-medium transition-colors",
                settings.theme === t.id ? "border-line-strong bg-surface-muted text-ink" : "border-line text-ink-soft hover:bg-surface-muted",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Màu chủ đạo</FieldLabel>
        <p className="-mt-1 mb-2 text-[11.5px] text-ink-faint">Dùng cho điểm nhấn và trạng thái hoàn thành. Đỏ được giữ riêng cho quá hạn.</p>
        <div className="flex flex-wrap items-center gap-2">
          {PRIMARY_COLORS.map((c) => (
            <Tooltip key={c.value} label={c.name}>
              <button
                type="button"
                aria-label={c.name}
                aria-pressed={settings.primary === c.value}
                onClick={() => onUpdate({ primary: c.value })}
                style={{ backgroundColor: c.value }}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-white transition-transform hover:scale-110",
                  settings.primary === c.value && "ring-2 ring-ink/70 ring-offset-2 ring-offset-surface",
                )}
              >
                {settings.primary === c.value ? <Check size={13} /> : null}
              </button>
            </Tooltip>
          ))}
          <ColorPickerPopover value={settings.primary} onChange={(primary) => onUpdate({ primary })} onOpenChange={onPreview}>
            <button
              type="button"
              aria-label="Màu tuỳ chỉnh"
              style={custom ? { backgroundColor: settings.primary } : { background: RAINBOW }}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-white transition-transform hover:scale-110",
                custom && "ring-2 ring-ink/70 ring-offset-2 ring-offset-surface",
              )}
            >
              {custom ? <Check size={13} /> : null}
            </button>
          </ColorPickerPopover>
        </div>
      </div>
    </div>
  );
}

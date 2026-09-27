import type { ReactNode } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type ColorPickerPopoverProps = {
  /** Current hex colour (e.g. "#3b82f6"). */
  value: string;
  /** Fires continuously while dragging — wire to live state. */
  onChange: (value: string) => void;
  /** Mirrors the popover open state (used to preview on the page behind). */
  onOpenChange?: (open: boolean) => void;
  /** The swatch that opens the picker. */
  children: ReactNode;
  align?: "start" | "center" | "end";
};

/** In-app colour picker (saturation square + hue bar + hex field) in a popover. */
export function ColorPickerPopover({ value, onChange, onOpenChange, children, align = "center" }: ColorPickerPopoverProps) {
  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 space-y-3 p-3">
        <HexColorPicker color={value} onChange={onChange} className="pt-colorful" />
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-line" style={{ backgroundColor: value }} />
          <HexColorInput
            color={value}
            onChange={onChange}
            prefixed
            aria-label="Mã màu hex"
            className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-2.5 font-mono text-[12.5px] uppercase text-ink outline-none focus:border-line-strong"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

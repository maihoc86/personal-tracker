import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;
export const MenuGroup = Dropdown.Group;

export function MenuContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Dropdown.Content>) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-[60] min-w-[190px] max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto rounded-[10px] border border-line bg-surface p-1 shadow-[var(--shadow-float)] outline-none",
          "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
          className,
        )}
        {...props}
      />
    </Dropdown.Portal>
  );
}

type MenuItemProps = ComponentProps<typeof Dropdown.Item> & {
  icon?: ReactNode;
  /** Right-aligned hint (shortcut, count). */
  hint?: ReactNode;
  selected?: boolean;
  danger?: boolean;
};

export function MenuItem({ icon, hint, selected, danger, className, children, ...props }: MenuItemProps) {
  return (
    <Dropdown.Item
      className={cn(
        "flex h-8 cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-[13px] outline-none",
        "data-[highlighted]:bg-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        danger ? "text-danger" : "text-ink",
        className,
      )}
      {...props}
    >
      {icon ? <span className="grid w-4 shrink-0 place-items-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="shrink-0 text-[11px] text-ink-faint">{hint}</span> : null}
      {selected ? <Check size={14} className="shrink-0 text-accent-ink" /> : null}
    </Dropdown.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Dropdown.Label className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-ink-faint">
      {children}
    </Dropdown.Label>
  );
}

export function MenuSeparator() {
  return <Dropdown.Separator className="my-1 h-px bg-line" />;
}

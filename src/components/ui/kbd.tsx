import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** A keycap for shortcut hints. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-grid h-[18px] min-w-[18px] place-items-center rounded-[4px] border border-line bg-surface-muted px-1 font-mono text-[10.5px] font-medium leading-none text-ink-faint",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

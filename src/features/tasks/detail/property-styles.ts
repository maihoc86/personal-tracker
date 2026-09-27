import { cn } from "../../../lib/cn";

/** Borderless value button that reveals itself on hover (Linear-style). */
export const propButton = cn(
  "flex h-8 w-full min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-2 text-left text-[13px] text-ink transition-colors",
  "hover:bg-surface-hover/70 data-[state=open]:bg-surface-hover/70",
);

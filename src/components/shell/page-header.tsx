import { Menu as MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/icon-button";
import { ui } from "./ui-store";

/** Slim top bar of every page: (mobile menu) · title · actions. */
export function PageHeader({
  title,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-2 border-b border-line px-2 sm:px-4", className)}>
      <IconButton className="lg:hidden" aria-label="Mở menu" onClick={() => ui.setMobileNav(true)}>
        <MenuIcon size={17} />
      </IconButton>
      {icon}
      <h1 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
    </header>
  );
}

/** Centered hint for an empty page or view. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid h-full min-h-[220px] place-items-center p-6">
      <div className="max-w-sm text-center">
        {icon ? <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-[10px] bg-surface-muted text-ink-faint">{icon}</div> : null}
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        {hint ? <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">{hint}</p> : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

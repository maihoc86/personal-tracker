import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Tooltip } from "./tooltip";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "solid" | "outline";
  size?: "sm" | "md";
  /** Keyboard shortcut shown in the tooltip. */
  shortcut?: ReactNode;
};

/** Square icon button with an automatic tooltip from its label. */
export function IconButton({
  variant = "ghost",
  size = "md",
  shortcut,
  className,
  title,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  const label = title ?? ariaLabel;
  const button = (
    <button
      type="button"
      aria-label={ariaLabel ?? title}
      className={cn(
        "grid shrink-0 place-items-center rounded-[var(--radius-control)] transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
        variant === "ghost" && "text-ink-soft hover:bg-surface-hover hover:text-ink",
        variant === "outline" && "border border-line bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink",
        variant === "solid" && "bg-btn text-btn-ink hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
  return label ? (
    <Tooltip label={label} shortcut={shortcut}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

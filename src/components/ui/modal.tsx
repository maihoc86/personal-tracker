import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { IconButton } from "./icon-button";
import { isPopperOpen, useDialogBehavior } from "./use-dialog-behavior";

type ModalProps = {
  open: boolean;
  /** A string renders as a heading; a node renders as-is; null hides the header. */
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Optional control rendered in the header, left of the close button. */
  headerAction?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Pin the dialog near the top (command palette, quick add). */
  top?: boolean;
  /**
   * Fade the dialog out (but keep it mounted) so a live change is visible on
   * the page behind it — e.g. while the accent colour picker is open.
   */
  peek?: boolean;
  className?: string;
};

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

/** Centered dialog with animated enter/exit, focus trap and Escape stacking. */
export function Modal({
  open,
  title,
  onClose,
  children,
  headerAction,
  size = "md",
  top,
  peek,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, onClose, dialogRef);

  const onBackdrop = () => {
    if (peek || isPopperOpen()) return;
    onClose();
  };

  // Portal to <body> so the fixed overlay always covers the full viewport.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex justify-center p-3 sm:p-6",
            top ? "items-start pt-[12vh]" : "items-center",
            peek ? "" : "bg-[rgb(16_18_16/0.32)]",
          )}
          onMouseDown={onBackdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: peek ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : "Hộp thoại"}
            tabIndex={-1}
            className={cn(
              "flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[var(--radius-sheet)] border border-line bg-surface shadow-[var(--shadow-float)] outline-none",
              SIZES[size],
              peek && "pointer-events-none",
              className,
            )}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {title !== null ? (
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-4">
                {typeof title === "string" ? (
                  <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                ) : (
                  <div className="min-w-0 flex-1">{title}</div>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {headerAction}
                  <IconButton aria-label="Đóng" shortcut="Esc" onClick={onClose}>
                    <X size={16} />
                  </IconButton>
                </div>
              </div>
            ) : null}
            <div className={cn("min-h-0 flex-1 overflow-y-auto", title !== null && "px-5 pb-5 pt-3")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

import { AnimatePresence, motion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { isPopperOpen, useDialogBehavior } from "./use-dialog-behavior";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * Right-hand "peek" panel (Notion-style): the page stays visible on the left
 * so you keep your place while editing a task. Full-screen on phones.
 */
export function Sheet({ open, onClose, label, children, className }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, onClose, ref);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-40 bg-[rgb(16_18_16/0.18)]"
          onMouseDown={() => {
            if (!isPopperOpen()) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-0 flex flex-col overflow-hidden bg-surface outline-none",
              "sm:inset-y-2 sm:left-auto sm:right-2 sm:w-[min(900px,calc(100vw-5rem))] sm:rounded-[var(--radius-sheet)] sm:border sm:border-line sm:shadow-[var(--shadow-float)]",
              className,
            )}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {children}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

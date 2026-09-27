import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-[13px] text-ink " +
  "placeholder:text-ink-faint outline-none transition-colors " +
  "focus:border-line-strong focus:ring-2 focus:ring-accent/25";

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-9", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "resize-none leading-relaxed", className)} {...props} />;
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-medium text-ink-soft">
      {children}
    </label>
  );
}

/** Small uppercase-free section heading used inside panels and settings. */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[12px] font-semibold text-ink-soft">{children}</h3>
      {action}
    </div>
  );
}

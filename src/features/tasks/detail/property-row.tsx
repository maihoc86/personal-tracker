import type { ReactNode } from "react";

/** One label/value line in the task property rail. */
export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-start gap-2">
      <span className="w-[84px] shrink-0 pt-[7px] text-[12px] text-ink-faint">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <span className="text-ink-faint">{children}</span>;
}

import { lazy, Suspense } from "react";
import { cn } from "../../lib/cn";

// react-markdown + remark-gfm are sizeable; load them only when Markdown shows.
const MarkdownRenderer = lazy(() => import("./markdown-renderer"));

/** User Markdown, rendered safely; plain text is shown while the renderer loads. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <Suspense fallback={<div className={cn("prose-note whitespace-pre-wrap", className)}>{children}</div>}>
      <MarkdownRenderer className={className}>{children}</MarkdownRenderer>
    </Suspense>
  );
}

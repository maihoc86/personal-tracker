import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/cn";

const components: Components = {
  // External links open in a new tab and never get access to this window.
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

/**
 * Render user Markdown (GFM: task lists, tables, strikethrough). Raw HTML is
 * not rendered and unsafe URLs (javascript:) are stripped by react-markdown.
 */
export default function MarkdownRenderer({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-note", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

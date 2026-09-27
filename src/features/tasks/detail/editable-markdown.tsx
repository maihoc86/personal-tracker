import { useEffect, useRef, useState } from "react";
import { Markdown } from "../../../components/ui/markdown";
import { cn } from "../../../lib/cn";

type EditableMarkdownProps = {
  value: string;
  onSave: (value: string) => void;
  placeholder: string;
  /** Re-seed the draft when this changes (e.g. another task opened). */
  resetKey: string;
  className?: string;
  minRows?: number;
};

/**
 * Rendered Markdown that turns into a textarea on click and saves on blur —
 * the Notion-style "just click and type" description.
 */
export function EditableMarkdown({ value, onSave, placeholder, resetKey, className, minRows = 4 }: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
    setEditing(false);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  function commit() {
    if (draft !== value) onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        autoFocus
        rows={minRows}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            commit();
          }
        }}
        placeholder={placeholder}
        className={cn(
          "block w-full resize-none rounded-[8px] border border-line-strong bg-surface px-3 py-2 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:font-sans placeholder:text-ink-faint",
          className,
        )}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Let links and task-list checkboxes behave normally.
        if ((e.target as HTMLElement).closest("a,input")) return;
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={cn("-mx-3 cursor-text rounded-[8px] px-3 py-2 transition-colors hover:bg-surface-muted/70", className)}
    >
      {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-[13px] text-ink-faint">{placeholder}</p>}
    </div>
  );
}

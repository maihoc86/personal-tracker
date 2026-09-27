import { X } from "lucide-react";
import { useState } from "react";
import { isSubmitEnter } from "../../../lib/keyboard";
import { foldText } from "../../../lib/text";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Tags used elsewhere, offered as suggestions while typing. */
  suggestions?: string[];
};

/** Tag chips: type and press Enter/"," to add, Backspace on empty removes the last. */
export function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const q = foldText(draft.replace(/^#/, ""));
  const matches = q
    ? suggestions.filter((s) => !tags.includes(s) && foldText(s).includes(q)).slice(0, 5)
    : [];

  function add(value = draft) {
    const clean = value.trim().replace(/^#/, "").replace(/,$/, "");
    setDraft("");
    if (clean && !tags.includes(clean)) onChange([...tags, clean]);
  }

  return (
    <div className="relative">
      <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-[var(--radius-control)] px-1 py-1 transition-colors focus-within:bg-surface hover:bg-surface-hover/60">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex h-5 items-center gap-0.5 rounded-[5px] border border-line bg-surface pl-1.5 pr-0.5 text-[11.5px] font-medium text-ink-soft">
            <span className="text-ink-faint">#</span>
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Xoá tag ${tag}`}
              className="grid h-4 w-4 place-items-center rounded-[3px] text-ink-faint hover:bg-surface-hover hover:text-ink"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (isSubmitEnter(e) || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => add()}
          placeholder={tags.length ? "" : "Thêm tag…"}
          aria-label="Thêm tag"
          className="h-5 min-w-[70px] flex-1 bg-transparent px-1 text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      {matches.length ? (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[8px] border border-line bg-surface p-1 shadow-[var(--shadow-float)]">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(m);
              }}
              className="flex h-7 w-full items-center rounded-[5px] px-2 text-left text-[12.5px] text-ink-soft hover:bg-surface-hover hover:text-ink"
            >
              #{m}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

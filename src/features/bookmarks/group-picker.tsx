import { Plus } from "lucide-react";
import { useState } from "react";
import { TextField } from "../../components/ui/form-controls";
import { cn } from "../../lib/cn";

type GroupPickerProps = {
  groups: string[];
  value: string;
  onChange: (group: string) => void;
};

/**
 * Pick an existing group or create a new one. When no groups exist yet, only
 * the "create" input shows — there is no list to choose from.
 */
export function GroupPicker({ groups, value, onChange }: GroupPickerProps) {
  // A typed value that isn't an existing group counts as "creating new".
  const isNew = value !== "" && !groups.includes(value);
  const [creating, setCreating] = useState(isNew);

  if (groups.length === 0) {
    return (
      <TextField
        placeholder="Tạo nhóm mới (không bắt buộc)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        <Chip
          active={value === "" && !creating}
          onClick={() => {
            setCreating(false);
            onChange("");
          }}
        >
          Không nhóm
        </Chip>
        {groups.map((g) => (
          <Chip
            key={g}
            active={value === g}
            onClick={() => {
              setCreating(false);
              onChange(g);
            }}
          >
            {g}
          </Chip>
        ))}
        <Chip
          active={creating}
          onClick={() => {
            setCreating(true);
            onChange("");
          }}
        >
          <Plus size={13} />
          Nhóm mới
        </Chip>
      </div>
      {creating ? (
        <TextField
          autoFocus
          placeholder="Tên nhóm mới"
          value={isNew ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-[6px] border px-2.5 text-[12px] font-medium transition-colors",
        active ? "border-transparent bg-accent-soft text-accent-ink" : "border-line text-ink-soft hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}

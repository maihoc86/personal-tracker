import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ui, useUi } from "../../components/shell/ui-store";
import { Button } from "../../components/ui/button";
import { FieldLabel, TextArea, TextField } from "../../components/ui/form-controls";
import { Modal } from "../../components/ui/modal";
import { cn } from "../../lib/cn";
import { isSubmitEnter } from "../../lib/keyboard";
import { navigate } from "../../lib/router";
import { projectActions, useProjects } from "./project-store";
import { AREAS, AREA_META, PROJECT_COLORS, cleanKey, suggestKey, type Area } from "./project-types";

/** Create or edit a project: name, key prefix, area and colour. */
export function ProjectDialog() {
  const { projectDialog } = useUi();
  const projects = useProjects();
  const editing = projectDialog?.mode === "edit" ? projects.find((p) => p.id === projectDialog.id) : undefined;
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [area, setArea] = useState<Area>("work");
  const [color, setColor] = useState(PROJECT_COLORS[0].value);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!projectDialog) return;
    if (editing) {
      setName(editing.name);
      setKey(editing.key);
      setKeyTouched(true);
      setArea(editing.area);
      setColor(editing.color);
      setDescription(editing.description);
    } else {
      const a = projectDialog.mode === "new" ? projectDialog.area : "work";
      setName("");
      setKey("");
      setKeyTouched(false);
      setArea(a);
      setColor(a === "work" ? PROJECT_COLORS[0].value : PROJECT_COLORS[4].value);
      setDescription("");
    }
  }, [projectDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  const taken = projects.filter((p) => p.id !== editing?.id).map((p) => p.key);
  const effectiveKey = keyTouched ? cleanKey(key) : suggestKey(name, taken);
  const keyClash = keyTouched && taken.includes(effectiveKey);

  function submit() {
    if (!name.trim()) return;
    if (editing) {
      projectActions.update(editing.id, { name, key: effectiveKey, area, color, description });
      toast(`Đã lưu dự án ${name.trim()}`);
    } else {
      const created = projectActions.add({ name, key: effectiveKey, area, color, description });
      toast(`Đã tạo dự án ${created.name} (${created.key})`);
      navigate({ name: "project", id: created.id });
    }
    ui.closeProject();
  }

  return (
    <Modal open={!!projectDialog} onClose={ui.closeProject} title={editing ? "Sửa dự án" : "Dự án mới"} size="sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <div>
            <FieldLabel htmlFor="project-name">Tên dự án</FieldLabel>
            <TextField
              id="project-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (isSubmitEnter(e)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="vd: Website khách hàng"
            />
          </div>
          <div>
            <FieldLabel htmlFor="project-key">Mã</FieldLabel>
            <TextField
              id="project-key"
              value={effectiveKey}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(e.target.value);
              }}
              maxLength={6}
              className={cn("font-mono uppercase", keyClash && "border-danger")}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11.5px] text-ink-faint">
          {keyClash ? (
            <span className="text-danger">Mã {effectiveKey} đã dùng — sẽ tự đánh số thêm khi lưu.</span>
          ) : (
            <>
              Task sẽ có mã dạng <span className="font-mono text-ink-soft">{effectiveKey || "DA"}-12</span>.
            </>
          )}
        </p>

        <div>
          <FieldLabel>Khu vực</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                onClick={() => setArea(a)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] border text-[13px] font-medium transition-colors",
                  area === a ? "border-line-strong bg-surface-muted text-ink" : "border-line text-ink-soft hover:bg-surface-muted",
                )}
              >
                <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: `var(--color-${a})` }} />
                {AREA_META[a].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Màu</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                aria-pressed={color === c.value}
                onClick={() => setColor(c.value)}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-[7px] text-white transition-transform hover:scale-105",
                  color === c.value && "ring-2 ring-ink/70 ring-offset-2 ring-offset-surface",
                )}
                style={{ backgroundColor: c.value }}
              >
                {color === c.value ? <Check size={13} /> : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="project-desc">Mô tả (không bắt buộc)</FieldLabel>
          <TextArea id="project-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mục tiêu, khách hàng, mốc chính…" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={ui.closeProject}>Huỷ</Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {editing ? "Lưu" : "Tạo dự án"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

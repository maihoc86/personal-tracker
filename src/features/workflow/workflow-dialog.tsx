import { LayoutTemplate } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ui, useUi } from "../../components/shell/ui-store";
import { Button } from "../../components/ui/button";
import { useConfirm } from "../../components/ui/confirm-dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../components/ui/menu";
import { Modal } from "../../components/ui/modal";
import { useProjects } from "../projects/project-store";
import { Switch } from "../tasks/components/filter-bar";
import { useTasks } from "../tasks/task-store";
import { StageEditor } from "./stage-editor";
import { stagesFromTemplate, workflowActions } from "./workflow-actions";
import { WORKFLOW_TEMPLATES, hasCustomStages, resolveStage, stagesFor, validateStages, type Stage } from "./workflow-model";
import { useWorkflow } from "./workflow-store";

/** Edit the default workflow or one project's stages. */
export function WorkflowDialog() {
  const { workflowDialog } = useUi();
  const wf = useWorkflow();
  const projects = useProjects();
  const tasks = useTasks();
  const confirm = useConfirm();
  const projectId = workflowDialog?.scope === "project" ? workflowDialog.id : null;
  const project = projects.find((p) => p.id === projectId);
  const [useDefault, setUseDefault] = useState(true);
  const [draft, setDraft] = useState<Stage[]>([]);

  useEffect(() => {
    if (!workflowDialog) return;
    if (projectId !== null) {
      setUseDefault(!hasCustomStages(wf, projectId));
      setDraft(stagesFor(wf, projectId));
    } else {
      setUseDefault(false);
      setDraft(wf.defaultStages);
    }
  }, [workflowDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tasks this workflow governs: the project's, or (default) every task
  // in the Inbox or in a project that doesn't have its own stages.
  const governed = useMemo(() => {
    if (projectId !== null) return tasks.filter((t) => t.projectId === projectId);
    const known = new Set(projects.map((p) => p.id));
    return tasks.filter((t) => !known.has(t.projectId) || !hasCustomStages(wf, t.projectId));
  }, [tasks, projects, projectId, wf]);

  const current = projectId !== null ? stagesFor(wf, projectId) : wf.defaultStages;
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of governed) {
      if (t.status === "done") continue;
      const id = resolveStage(t, current).id;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [governed, current]);

  const editing = !useDefault;
  const problem = editing ? validateStages(draft) : null;
  const title = project ? `Stage · ${project.name}` : "Workflow mặc định";

  async function save() {
    if (problem) return;
    const removed = current.filter((s) => !draft.some((d) => d.id === s.id));
    const affected = governed.filter((t) => removed.some((s) => s.id === resolveStage(t, current).id)).length;
    if (affected) {
      const ok = await confirm({
        title: `Chuyển ${affected} task sang stage khác?`,
        message: `Stage đã xoá (${removed.map((s) => s.name).join(", ")}) còn task. Chúng sẽ chuyển sang stage đầu tiên cùng nhóm trong workflow mới.`,
        confirmLabel: "Lưu và chuyển",
      });
      if (!ok) return;
    }
    const clean = draft.map((s) => ({ ...s, name: s.name.trim() }));
    if (projectId !== null) {
      workflowActions.setProjectStages(projectId, useDefault ? null : clean);
    } else {
      workflowActions.setDefaultStages(clean);
    }
    toast(projectId !== null && useDefault ? `${project?.name ?? "Dự án"} dùng workflow mặc định` : "Đã lưu stage");
    ui.closeStages();
  }

  return (
    <Modal open={!!workflowDialog} title={title} onClose={ui.closeStages} size="lg">
      <div className="space-y-4">
        {projectId !== null ? (
          <label className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2.5">
            <span>
              <span className="block text-[13px] font-medium text-ink">Dùng workflow mặc định</span>
              <span className="block text-[12px] text-ink-faint">Tắt để dự án có bộ stage riêng (bắt đầu từ bộ mặc định).</span>
            </span>
            <Switch
              checked={useDefault}
              onChange={(v) => {
                setUseDefault(v);
                if (!v) setDraft(stagesFor(wf, projectId));
              }}
              label="Dùng workflow mặc định"
            />
          </label>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Áp dụng cho Inbox và mọi dự án chưa có bộ stage riêng, kể cả dự án tạo mới.
          </p>
        )}

        {editing ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-faint">
                Mỗi stage thuộc một nhóm — Hôm nay, Insights và việc lặp lại dựa vào nhóm này.
              </p>
              <Menu>
                <MenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <LayoutTemplate size={14} />
                    Áp dụng mẫu
                  </Button>
                </MenuTrigger>
                <MenuContent align="end">
                  {WORKFLOW_TEMPLATES.map((tpl) => (
                    <MenuItem key={tpl.id} onSelect={() => setDraft(stagesFromTemplate(tpl))} hint={tpl.stages.length}>
                      {tpl.label}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            </div>
            <StageEditor stages={draft} onChange={setDraft} counts={counts} />
          </>
        ) : (
          <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-soft">
            {wf.defaultStages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1.5">
                {i ? <span className="text-ink-faint">→</span> : null}
                <span className="rounded-[6px] border border-line px-2 py-1">{s.name}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {problem ? <p className="mr-auto text-[12.5px] text-danger">{problem}</p> : null}
          <Button onClick={ui.closeStages}>Huỷ</Button>
          <Button variant="primary" onClick={save} disabled={!!problem}>
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
}

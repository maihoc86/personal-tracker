import { createId } from "../../lib/id";
import { taskActions } from "../tasks/task-store";
import type { Stage, WorkflowTemplate } from "./workflow-model";
import { workflowStore } from "./workflow-store";

export const workflowActions = {
  /** Save a project's own stages, or pass null to go back to the default. */
  setProjectStages(projectId: string, stages: Stage[] | null) {
    workflowStore.set((wf) => {
      const byProject = { ...wf.byProject };
      if (stages) byProject[projectId] = stages;
      else delete byProject[projectId];
      return { ...wf, byProject };
    });
    taskActions.syncStages();
  },

  setDefaultStages(stages: Stage[]) {
    workflowStore.set((wf) => ({ ...wf, defaultStages: stages }));
    taskActions.syncStages();
  },

  /** Forget a deleted project's stages. */
  dropProject(projectId: string) {
    workflowStore.set((wf) => {
      if (!(projectId in wf.byProject)) return wf;
      const byProject = { ...wf.byProject };
      delete byProject[projectId];
      return { ...wf, byProject };
    });
  },
};

/** Fresh stages from a template (new ids, so nothing collides). */
export function stagesFromTemplate(template: WorkflowTemplate): Stage[] {
  return template.stages.map((s) => ({ ...s, id: createId() }));
}

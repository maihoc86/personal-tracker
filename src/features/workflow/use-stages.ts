import { useCallback } from "react";
import type { Task } from "../tasks/task-types";
import { resolveStage, stagesFor, type Stage } from "./workflow-model";
import { useWorkflow } from "./workflow-store";

/** Stages of one project ("" = Inbox). */
export function useStagesFor(projectId: string): Stage[] {
  return stagesFor(useWorkflow(), projectId);
}

/** Resolvers for views that mix projects: a task's stages and its current stage. */
export function useStageResolver() {
  const wf = useWorkflow();
  const stagesOf = useCallback((t: Pick<Task, "projectId">) => stagesFor(wf, t.projectId), [wf]);
  const stageOf = useCallback((t: Task) => resolveStage(t, stagesFor(wf, t.projectId)), [wf]);
  return { stagesOf, stageOf };
}

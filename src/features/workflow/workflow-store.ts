import { DATA_KEYS } from "../../lib/data-keys";
import { createPersistedStore, useStore } from "../../lib/store";
import { initialWorkflow, migrateWorkflow, type WorkflowState } from "./workflow-model";

/** Stage lists: the default (Inbox + new projects) and per-project overrides. */
export const workflowStore = createPersistedStore<WorkflowState>(DATA_KEYS.workflows, initialWorkflow(), {
  normalize: migrateWorkflow,
});

export function useWorkflow(): WorkflowState {
  return useStore(workflowStore);
}

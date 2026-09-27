import { DATA_KEYS } from "../../lib/data-keys";
import { createId } from "../../lib/id";
import { createPersistedStore, useStore } from "../../lib/store";
import { taskStore } from "../tasks/task-store";
import { applyTaskChanges } from "../tasks/task-model";
import { cleanKey, migrateProjects, suggestKey, type Project, type ProjectDraft } from "./project-types";

export const projectStore = createPersistedStore<Project[]>(DATA_KEYS.projects, [], {
  normalize: migrateProjects,
});

/** A unique key: the requested one when free, otherwise a numbered variant. */
function uniqueKey(requested: string, name: string, exceptId?: string): string {
  const taken = projectStore
    .get()
    .filter((p) => p.id !== exceptId)
    .map((p) => p.key);
  const clean = cleanKey(requested);
  if (clean && !taken.includes(clean) && clean !== "INB") return clean;
  return suggestKey(clean || name, taken);
}

export const projectActions = {
  add(draft: ProjectDraft): Project {
    const project: Project = {
      id: createId(),
      name: draft.name.trim(),
      key: uniqueKey(draft.key, draft.name),
      color: draft.color,
      area: draft.area,
      description: draft.description ?? "",
      archived: false,
      createdAt: Date.now(),
    };
    projectStore.set((prev) => [...prev, project]);
    return project;
  },

  update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>) {
    projectStore.set((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        if (patch.key !== undefined) next.key = uniqueKey(patch.key, next.name, id);
        if (patch.name !== undefined) next.name = patch.name.trim() || p.name;
        return next;
      }),
    );
  },

  /** Delete a project; its tasks move to the Inbox (and get Inbox numbers). */
  remove(id: string) {
    taskStore.set((prev) =>
      applyTaskChanges(
        prev,
        prev.map((t) => (t.projectId === id ? { ...t, projectId: "" } : t)),
      ),
    );
    projectStore.set((prev) => prev.filter((p) => p.id !== id));
  },

  /** Persist a new sidebar order. */
  reorder(ids: string[]) {
    projectStore.set((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const ordered = ids.map((pid) => byId.get(pid)).filter((p): p is Project => !!p);
      const rest = prev.filter((p) => !ids.includes(p.id));
      return [...ordered, ...rest];
    });
  },
};

export function useProjects(): Project[] {
  return useStore(projectStore);
}

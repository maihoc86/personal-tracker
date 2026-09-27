import { createMemoryStore, useStore } from "../../lib/store";
import type { TaskDraft } from "../../features/tasks/task-types";

/**
 * Transient, app-wide UI state (which overlay is open). Kept in a tiny store
 * so the sidebar, shortcuts, palette and pages can all open the same dialogs.
 */
type UiState = {
  palette: boolean;
  /** Prefill for the create-task dialog; null when closed. */
  quickAdd: Partial<TaskDraft> | null;
  /** Project dialog: "new" (with area), an id to edit, or null. */
  projectDialog: { mode: "new"; area: "work" | "personal" } | { mode: "edit"; id: string } | null;
  settings: boolean;
  mobileNav: boolean;
};

const initial: UiState = {
  palette: false,
  quickAdd: null,
  projectDialog: null,
  settings: false,
  mobileNav: false,
};

export const uiStore = createMemoryStore<UiState>(initial);

const patch = (p: Partial<UiState>) => uiStore.set((s) => ({ ...s, ...p }));

export const ui = {
  openPalette: () => patch({ palette: true, mobileNav: false }),
  closePalette: () => patch({ palette: false }),
  openQuickAdd: (prefill: Partial<TaskDraft> = {}) => patch({ quickAdd: prefill, palette: false, mobileNav: false }),
  closeQuickAdd: () => patch({ quickAdd: null }),
  newProject: (area: "work" | "personal" = "work") => patch({ projectDialog: { mode: "new", area }, palette: false }),
  editProject: (id: string) => patch({ projectDialog: { mode: "edit", id } }),
  closeProject: () => patch({ projectDialog: null }),
  openSettings: () => patch({ settings: true, palette: false, mobileNav: false }),
  closeSettings: () => patch({ settings: false }),
  setMobileNav: (open: boolean) => patch({ mobileNav: open }),
};

export function useUi(): UiState {
  return useStore(uiStore);
}

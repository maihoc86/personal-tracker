import { useLocalStorage } from "../../lib/use-local-storage";
import { EMPTY_FILTER, type GroupBy, type SortBy, type TaskFilter } from "./task-selectors";

export type ViewKind = "board" | "list" | "calendar" | "timeline";

export type ViewPrefs = {
  view: ViewKind;
  groupBy: GroupBy;
  sortBy: SortBy;
  showDone: boolean;
};

const DEFAULT_PREFS: ViewPrefs = { view: "board", groupBy: "status", sortBy: "manual", showDone: true };

/** Per-page view choice, display options and filter — remembered per page. */
export function useViewPrefs(scopeKey: string, defaults: Partial<ViewPrefs> = {}) {
  const [stored, setPrefs] = useLocalStorage<ViewPrefs>(`pt.view:${scopeKey}`, { ...DEFAULT_PREFS, ...defaults });
  const [filter, setFilter] = useLocalStorage<TaskFilter>(`pt.filter:${scopeKey}`, EMPTY_FILTER);
  const prefs = { ...DEFAULT_PREFS, ...defaults, ...stored };
  return {
    prefs,
    setPrefs: (patch: Partial<ViewPrefs>) => setPrefs({ ...prefs, ...patch }),
    filter: { ...EMPTY_FILTER, ...filter },
    setFilter,
  };
}

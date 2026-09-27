import { useMemo, useSyncExternalStore } from "react";

/** Every page the workspace can show. Hash-based so links work offline. */
export type Route =
  | { name: "today" }
  | { name: "inbox" }
  | { name: "tasks" }
  | { name: "project"; id: string }
  | { name: "insights" }
  | { name: "notes"; id?: string }
  | { name: "focus" }
  | { name: "links" };

type Query = Record<string, string | undefined>;

const SIMPLE: Route["name"][] = ["today", "inbox", "tasks", "insights", "focus", "links"];

/** "#/project/abc?task=xyz" → route + query. Unknown paths fall back to today. */
export function parseHash(hash: string): { route: Route; query: URLSearchParams } {
  const clean = hash.replace(/^#\/?/, "");
  const [path, search = ""] = clean.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(search);
  const [head, id] = parts;

  if (head === "project" && id) return { route: { name: "project", id }, query };
  if (head === "notes") return { route: id ? { name: "notes", id } : { name: "notes" }, query };
  if (SIMPLE.includes(head as Route["name"])) {
    return { route: { name: head } as Route, query };
  }
  return { route: { name: "today" }, query };
}

export function buildHash(route: Route, query: Query = {}): string {
  let path: string = route.name;
  if (route.name === "project") path = `project/${encodeURIComponent(route.id)}`;
  if (route.name === "notes" && route.id) path = `notes/${encodeURIComponent(route.id)}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const search = params.toString();
  return `#/${path}${search ? `?${search}` : ""}`;
}

export function navigate(route: Route, query: Query = {}) {
  window.location.hash = buildHash(route, query);
}

/** Same page, different query (e.g. open/close the task panel). */
export function setQuery(patch: Query) {
  const { route, query } = parseHash(window.location.hash);
  const next: Query = Object.fromEntries(query.entries());
  navigate(route, { ...next, ...patch });
}

export function openTask(id: string) {
  setQuery({ task: id });
}

export function closeTask() {
  setQuery({ task: undefined });
}

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

const getHash = () => window.location.hash;

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return useMemo(() => parseHash(hash), [hash]);
}

/** Stable key for per-page preferences ("project:abc", "inbox"...). */
export function routeKey(route: Route): string {
  if (route.name === "project") return `project:${route.id}`;
  return route.name;
}

export function sameRoute(a: Route, b: Route): boolean {
  return routeKey(a) === routeKey(b);
}

import { deriveKey, foldText } from "../../lib/text";

/** Work and personal life live side by side; every project belongs to one. */
export const AREAS = ["work", "personal"] as const;
export type Area = (typeof AREAS)[number];

export const AREA_META: Record<Area, { label: string; color: string }> = {
  work: { label: "Công việc", color: "#4c6a92" },
  personal: { label: "Cá nhân", color: "#b7704f" },
};

export type Project = {
  id: string;
  name: string;
  /** Short upper-case prefix for task keys, e.g. "WEB" → WEB-12. */
  key: string;
  color: string;
  area: Area;
  description: string;
  archived: boolean;
  createdAt: number;
};

export type ProjectDraft = Pick<Project, "name" | "key" | "color" | "area"> &
  Partial<Pick<Project, "description">>;

/** Key used for tasks that have no project yet. */
export const INBOX_KEY = "INB";

/** Cool hues first (work), warm hues after (personal); any hex also works. */
export const PROJECT_COLORS = [
  { name: "Slate", value: "#4c6a92" },
  { name: "Mòng két", value: "#2f7f7a" },
  { name: "Chàm", value: "#5b5bd6" },
  { name: "Thép", value: "#5f6f7f" },
  { name: "Đất nung", value: "#b7704f" },
  { name: "Hồng gạch", value: "#c0566b" },
  { name: "Nghệ", value: "#b8862b" },
  { name: "Ô liu", value: "#7a8b3a" },
];

/** Upper-case A-Z/0-9 key, max 6 chars. */
export function cleanKey(raw: string): string {
  return foldText(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/** A key for `name` that doesn't collide with existing project keys. */
export function suggestKey(name: string, taken: string[]): string {
  const base = deriveKey(name) || "DA";
  const used = new Set([...taken, INBOX_KEY]);
  if (!used.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, 5)}${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return base;
}

type Loose = Record<string, unknown>;

/** Sanitize stored/imported projects; drops entries without id or name. */
export function migrateProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Project[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const p = item as Loose;
    if (typeof p.id !== "string" || typeof p.name !== "string" || seen.has(p.id)) continue;
    seen.add(p.id);
    const area: Area = p.area === "personal" ? "personal" : "work";
    out.push({
      id: p.id,
      name: p.name,
      key: cleanKey(typeof p.key === "string" ? p.key : "") || deriveKey(p.name) || "DA",
      color: typeof p.color === "string" && /^#[0-9a-f]{6}$/i.test(p.color)
        ? p.color
        : AREA_META[area].color,
      area,
      description: typeof p.description === "string" ? p.description : "",
      archived: p.archived === true,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
    });
  }
  return out;
}

export type Note = {
  id: string;
  title: string;
  /** Markdown body. */
  content: string;
  /** Linked project, or "" for a general note. */
  projectId: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

type Loose = Record<string, unknown>;

export function migrateNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Note[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const n = item as Loose;
    if (typeof n.id !== "string" || seen.has(n.id)) continue;
    seen.add(n.id);
    const createdAt = typeof n.createdAt === "number" ? n.createdAt : 0;
    out.push({
      id: n.id,
      title: typeof n.title === "string" ? n.title : "",
      content: typeof n.content === "string" ? n.content : "",
      projectId: typeof n.projectId === "string" ? n.projectId : "",
      pinned: n.pinned === true,
      createdAt,
      updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : createdAt,
    });
  }
  return out;
}

/** Turn the old single scratch note into the first note page. */
export function notesFromLegacy(legacy: unknown, id: string, now: number): Note[] {
  if (typeof legacy !== "string" || !legacy.trim()) return [];
  const [firstLine] = legacy.trim().split("\n");
  return [
    {
      id,
      title: firstLine.slice(0, 60),
      content: legacy,
      projectId: "",
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/** Pinned first, then most recently edited. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
  );
}

/** Display title — falls back to the first line of the body. */
export function noteTitle(note: Note): string {
  if (note.title.trim()) return note.title;
  const first = note.content.trim().split("\n")[0]?.replace(/^#+\s*/, "");
  return first ? first.slice(0, 60) : "Trang chưa đặt tên";
}

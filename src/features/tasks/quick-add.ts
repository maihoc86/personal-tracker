import { addDaysIso, parseIso, toIsoDate } from "../../lib/date";
import { parseDuration } from "../../lib/duration";
import { foldText } from "../../lib/text";
import type { Project } from "../projects/project-types";
import type { TaskPriority, TaskStatus } from "./task-types";

/**
 * Quick-add syntax, typed inline in the title:
 *   #tag        tag              !cao / !khan / !tb / !thap   priority
 *   @mai @t6 @25/12 @+3 @14h30   due date / time
 *   +WEB        project by key or name     ~2h ~30m          estimate
 *   *dang       status (backlog, todo, dang/doing, xong/done)
 */
export type QuickAddToken = {
  kind: "tag" | "priority" | "due" | "time" | "project" | "estimate" | "status";
  raw: string;
};

export type QuickAddResult = {
  title: string;
  tags: string[];
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  projectId?: string;
  estimatedHours?: number;
  tokens: QuickAddToken[];
};

const PRIORITY_WORDS: Record<string, TaskPriority> = {
  khan: "urgent", urgent: "urgent", "4": "urgent", "!!": "urgent",
  cao: "high", high: "high", "3": "high", "!": "high",
  tb: "medium", vua: "medium", medium: "medium", "2": "medium",
  thap: "low", low: "low", "1": "low",
};

const STATUS_WORDS: Record<string, TaskStatus> = {
  backlog: "backlog", todo: "todo", can: "todo", canlam: "todo",
  doing: "doing", dang: "doing", danglam: "doing",
  done: "done", xong: "done",
};

const WEEKDAYS: Record<string, number> = { cn: 0, t2: 1, t3: 2, t4: 3, t5: 4, t6: 5, t7: 6 };

/** Resolve an "@..." word to a date (or null when it isn't one). */
export function parseDueWord(word: string, today: string): string | null {
  const w = foldText(word).replace(/[\s-]/g, "");
  if (["homnay", "hn", "today", "nay"].includes(w)) return today;
  if (["mai", "tomorrow"].includes(w)) return addDaysIso(today, 1);
  if (["mot", "kia"].includes(w)) return addDaysIso(today, 2);
  if (["tuansau", "nextweek"].includes(w)) {
    const offset = (8 - parseIso(today).getDay()) % 7 || 7;
    return addDaysIso(today, offset);
  }
  if (w in WEEKDAYS) {
    const offset = (WEEKDAYS[w] - parseIso(today).getDay() + 7) % 7 || 7;
    return addDaysIso(today, offset);
  }
  const plus = /^\+(\d{1,3})d?$/.exec(w);
  if (plus) return addDaysIso(today, Number(plus[1]));
  const dm = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(w);
  if (dm) return resolveDayMonth(Number(dm[1]), Number(dm[2]), dm[3], today);
  return null;
}

function resolveDayMonth(day: number, month: number, year: string | undefined, today: string) {
  const base = parseIso(today);
  let y = year ? Number(year.length === 2 ? `20${year}` : year) : base.getFullYear();
  const make = () => new Date(y, month - 1, day);
  let d = make();
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  if (!year && toIsoDate(d) < today) {
    y += 1;
    d = make();
  }
  return toIsoDate(d);
}

/** "14h", "14h30", "14:30", "9h" → "HH:mm". */
export function parseTimeWord(word: string): string | null {
  const m = /^(\d{1,2})(?:[h:g](\d{2})?)$/i.exec(word.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function findProject(word: string, projects: Project[]): Project | undefined {
  const w = foldText(word).replace(/[\s_-]/g, "");
  return (
    projects.find((p) => foldText(p.key) === w) ??
    projects.find((p) => foldText(p.name).replace(/\s+/g, "") === w)
  );
}

export function parseQuickAdd(
  input: string,
  ctx: { projects: Project[]; today: string },
): QuickAddResult {
  const result: QuickAddResult = { title: "", tags: [], tokens: [] };
  const words: string[] = [];

  for (const raw of input.split(/\s+/).filter(Boolean)) {
    const sigil = raw[0];
    const body = raw.slice(1);
    const take = (kind: QuickAddToken["kind"]) => result.tokens.push({ kind, raw });

    if (sigil === "#" && body) {
      if (!result.tags.includes(body)) result.tags.push(body);
      take("tag");
    } else if (sigil === "!" && PRIORITY_WORDS[foldText(body)]) {
      result.priority = PRIORITY_WORDS[foldText(body)];
      take("priority");
    } else if (sigil === "@" && parseTimeWord(body)) {
      result.dueTime = parseTimeWord(body)!;
      take("time");
    } else if (sigil === "@" && parseDueWord(body, ctx.today)) {
      result.dueDate = parseDueWord(body, ctx.today)!;
      take("due");
    } else if (sigil === "+" && body && findProject(body, ctx.projects)) {
      result.projectId = findProject(body, ctx.projects)!.id;
      take("project");
    } else if (sigil === "~" && parseDuration(body, "h")) {
      result.estimatedHours = parseDuration(body, "h")! / 60;
      take("estimate");
    } else if (sigil === "*" && STATUS_WORDS[foldText(body)]) {
      result.status = STATUS_WORDS[foldText(body)];
      take("status");
    } else {
      words.push(raw);
    }
  }

  // A time without a date means "today at that time".
  if (result.dueTime && !result.dueDate) result.dueDate = ctx.today;
  result.title = words.join(" ");
  return result;
}

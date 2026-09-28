import { TASK_STATUSES, type Task, type TaskStatus } from "../tasks/task-types";

/**
 * A workflow stage (a board column). Each stage belongs to one of the four
 * built-in categories, so everything that reasons about progress — Today,
 * Insights, recurrence, "done" — keeps working with any custom workflow.
 */
export type Stage = {
  id: string;
  name: string;
  category: TaskStatus;
  /** Optional hex tint for the stage icon. */
  color?: string;
  /** Kanban work-in-progress limit for the column (0/undefined = none). */
  wipLimit?: number;
};

export type WorkflowState = {
  /** Used by the Inbox and every project without its own stages. */
  defaultStages: Stage[];
  /** Projects that customised their stages. */
  byProject: Record<string, Stage[]>;
};

/** Ids equal the categories so tasks saved before stages existed map 1:1. */
export const DEFAULT_STAGES: Stage[] = [
  { id: "backlog", name: "Backlog", category: "backlog" },
  { id: "todo", name: "Cần làm", category: "todo" },
  { id: "doing", name: "Đang làm", category: "doing" },
  { id: "done", name: "Hoàn thành", category: "done" },
];

export const CATEGORY_LABELS: Record<TaskStatus, string> = {
  backlog: "Chưa lên kế hoạch",
  todo: "Cần làm",
  doing: "Đang làm",
  done: "Hoàn thành",
};

export const initialWorkflow = (): WorkflowState => ({ defaultStages: DEFAULT_STAGES, byProject: {} });

export type WorkflowTemplate = { id: string; label: string; stages: Omit<Stage, "id">[] };

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: "default", label: "Mặc định (4 bước)", stages: DEFAULT_STAGES.map(({ id: _id, ...s }) => s) },
  {
    id: "software",
    label: "Phát triển phần mềm",
    stages: [
      { name: "Backlog", category: "backlog" },
      { name: "Cần làm", category: "todo" },
      { name: "Đang làm", category: "doing" },
      { name: "Review", category: "doing" },
      { name: "Kiểm thử", category: "doing" },
      { name: "Hoàn thành", category: "done" },
    ],
  },
  {
    id: "simple",
    label: "Đơn giản (3 bước)",
    stages: [
      { name: "Cần làm", category: "todo" },
      { name: "Đang làm", category: "doing" },
      { name: "Xong", category: "done" },
    ],
  },
  {
    id: "approval",
    label: "Duyệt nội dung",
    stages: [
      { name: "Ý tưởng", category: "backlog" },
      { name: "Soạn thảo", category: "doing" },
      { name: "Chờ duyệt", category: "doing" },
      { name: "Đã xuất bản", category: "done" },
    ],
  },
];

/** Stages governing tasks of `projectId` ("" = Inbox). */
export function stagesFor(state: WorkflowState, projectId: string): Stage[] {
  return state.byProject[projectId] ?? state.defaultStages;
}

export function hasCustomStages(state: WorkflowState, projectId: string): boolean {
  return projectId in state.byProject;
}

const ORDER = TASK_STATUSES;

/**
 * Best stage for a category: the first stage of that category, otherwise
 * the nearest not-done category (a workflow without Backlog files backlog
 * work under its first "to do" stage). Done always maps to a done stage.
 */
export function pickStage(stages: Stage[], category: TaskStatus): Stage {
  const exact = stages.find((s) => s.category === category);
  if (exact) return exact;
  if (category === "done") return stages.find((s) => s.category === "done") ?? stages[stages.length - 1];
  const open = stages.filter((s) => s.category !== "done");
  if (!open.length) return stages[0];
  const target = ORDER.indexOf(category);
  return [...open].sort(
    (a, b) => Math.abs(ORDER.indexOf(a.category) - target) - Math.abs(ORDER.indexOf(b.category) - target),
  )[0];
}

/** The stage a task currently shows in (falls back by category). */
export function resolveStage(task: Pick<Task, "stageId" | "status">, stages: Stage[]): Stage {
  return stages.find((s) => s.id === task.stageId) ?? pickStage(stages, task.status);
}

/**
 * Keep `stageId` and `status` consistent after a write. When the write
 * changed the status (tick "done", reopen, quick-add "*dang") the status
 * wins and the stage follows; otherwise the stage wins (drag to a column,
 * a stage whose category was edited). Unknown stages fall back by category.
 */
export function reconcileStages(prev: Task[], next: Task[], state: WorkflowState): Task[] {
  const before = new Map(prev.map((t) => [t.id, t]));
  return next.map((t) => {
    const stages = stagesFor(state, t.projectId);
    const current = stages.find((s) => s.id === t.stageId);
    if (current && current.category === t.status) return t;
    const old = before.get(t.id);
    const statusWins = !current || (old !== undefined && old.status !== t.status && old.stageId === t.stageId);
    const stage = statusWins ? pickStage(stages, t.status) : current;
    if (stage.id === t.stageId && stage.category === t.status) return t;
    return { ...t, stageId: stage.id, status: stage.category };
  });
}

export type StageProblem = string | null;

/** Why a stage list can't be saved, or null when it's valid. */
export function validateStages(stages: Stage[]): StageProblem {
  if (!stages.length) return "Cần ít nhất một stage.";
  if (stages.some((s) => !s.name.trim())) return "Stage nào cũng cần có tên.";
  const names = stages.map((s) => s.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return "Tên stage không được trùng nhau.";
  if (!stages.some((s) => s.category === "done")) return "Cần ít nhất một stage thuộc nhóm Hoàn thành.";
  if (!stages.some((s) => s.category !== "done")) return "Cần ít nhất một stage chưa hoàn thành.";
  return null;
}

type Loose = Record<string, unknown>;

function toStages(raw: unknown): Stage[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const stages = raw.flatMap((s): Stage[] => {
    if (typeof s !== "object" || s === null) return [];
    const r = s as Loose;
    if (typeof r.id !== "string" || typeof r.name !== "string" || seen.has(r.id)) return [];
    if (!TASK_STATUSES.includes(r.category as TaskStatus)) return [];
    seen.add(r.id);
    return [
      {
        id: r.id,
        name: r.name.slice(0, 40),
        category: r.category as TaskStatus,
        color: typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : undefined,
        wipLimit: typeof r.wipLimit === "number" && r.wipLimit > 0 ? Math.floor(r.wipLimit) : undefined,
      },
    ];
  });
  return validateStages(stages) === null ? stages : null;
}

/** Sanitize stored/imported workflows; invalid lists fall back to defaults. */
export function migrateWorkflow(raw: unknown): WorkflowState {
  const base = initialWorkflow();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Loose;
  const byProject: Record<string, Stage[]> = {};
  if (typeof r.byProject === "object" && r.byProject !== null) {
    for (const [id, list] of Object.entries(r.byProject as Loose)) {
      const stages = toStages(list);
      if (stages && id !== "__proto__") byProject[id] = stages;
    }
  }
  return { defaultStages: toStages(r.defaultStages) ?? base.defaultStages, byProject };
}

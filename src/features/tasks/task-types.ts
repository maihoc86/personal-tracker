/** Workflow columns for the board, in display order. */
export const TASK_STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Priority levels, low to high. */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const RECURRENCE_FREQS = ["daily", "weekdays", "weekly", "monthly"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];
export type Recurrence = { freq: RecurrenceFreq; interval: number };

/** A single "việc cần làm" line inside a task. */
export type ChecklistItem = { id: string; text: string; done: boolean };

export type Comment = { id: string; text: string; at: number };

/** Time spent on a task — typed in by hand or logged by a finished focus session. */
export type TimeLog = {
  id: string;
  minutes: number;
  at: number;
  source: "manual" | "focus";
};

export type ActivityKind = "created" | "status" | "stage" | "priority" | "due" | "project" | "recurred";

/**
 * Automatic history entry; `from`/`to` hold raw values the UI turns into
 * labels (stage entries store stage names so history survives deletions).
 */
export type Activity = {
  id: string;
  at: number;
  kind: ActivityKind;
  from?: string;
  to?: string;
};

export type Task = {
  id: string;
  /** Sequence within its project; shown as the key "WEB-12". */
  number: number;
  /** Owning project id, or "" for the Inbox. */
  projectId: string;
  title: string;
  description: string;
  /** Category of the current stage — what progress logic relies on. */
  status: TaskStatus;
  /** Custom workflow stage (board column); "" until first assigned. */
  stageId: string;
  priority: TaskPriority;
  /** ISO yyyy-mm-dd or "" — when work is planned to start (timeline). */
  startDate: string;
  /** ISO yyyy-mm-dd or "" when no due date. */
  dueDate: string;
  /** 24h "HH:mm" on the due date, or "". */
  dueTime: string;
  /** ISO day the task is planned to be worked on ("My Day"), or "". */
  plannedFor: string;
  /** Epoch ms of a custom reminder, if any. */
  remindAt?: number;
  /** Estimated effort in hours; undefined when not set. */
  estimatedHours?: number;
  tags: string[];
  checklist: ChecklistItem[];
  comments: Comment[];
  timeLogs: TimeLog[];
  activity: Activity[];
  recurrence?: Recurrence;
  /** Ids of tasks that must be done before this one can move. */
  blockedBy: string[];
  createdAt: number;
  updatedAt: number;
  /** Epoch ms when the task entered "done"; used to fold away old done tasks. */
  doneAt?: number;
};

/** Fields a person fills in when creating a task. */
export type TaskDraft = Partial<
  Pick<
    Task,
    | "projectId"
    | "description"
    | "status"
    | "stageId"
    | "priority"
    | "startDate"
    | "dueDate"
    | "dueTime"
    | "plannedFor"
    | "remindAt"
    | "estimatedHours"
    | "tags"
    | "checklist"
    | "recurrence"
    | "blockedBy"
  >
> & { title: string };

/** Everything a task patch may change (identity and history are managed). */
export type TaskPatch = Partial<
  Omit<Task, "id" | "number" | "createdAt" | "updatedAt" | "activity" | "doneAt">
>;

export const STATUS_META: Record<
  TaskStatus,
  { label: string; tone: string; chip: string }
> = {
  backlog: {
    label: "Backlog",
    tone: "text-ink-faint",
    chip: "bg-surface-muted text-ink-soft",
  },
  todo: {
    label: "Cần làm",
    tone: "text-ink-soft",
    chip: "bg-surface-muted text-ink",
  },
  doing: {
    label: "Đang làm",
    tone: "text-amber-500",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  done: {
    label: "Hoàn thành",
    tone: "text-accent",
    chip: "bg-accent-soft text-accent-ink",
  },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; tone: string; rank: number }
> = {
  low: { label: "Thấp", tone: "text-ink-faint", rank: 1 },
  medium: { label: "Trung bình", tone: "text-ink-soft", rank: 2 },
  high: { label: "Cao", tone: "text-ink", rank: 3 },
  urgent: { label: "Khẩn cấp", tone: "text-danger", rank: 4 },
};

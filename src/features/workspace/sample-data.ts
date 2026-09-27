import { DATA_KEYS, LEGACY_NOTE_KEY } from "../../lib/data-keys";
import { addDaysIso, todayIso } from "../../lib/date";
import { createId } from "../../lib/id";
import { suspendPersistence } from "../../lib/persistence";
import type { Bookmark } from "../bookmarks/use-bookmarks";
import type { FocusSession, FocusState } from "../focus/focus-model";
import { initialFocus } from "../focus/focus-model";
import type { Habit } from "../habits/use-habits";
import type { Note } from "../notes/note-types";
import type { Project } from "../projects/project-types";
import type { Task, TaskPriority, TaskStatus } from "../tasks/task-types";

const DAY = 86_400_000;

export type SampleData = {
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  bookmarks: Bookmark[];
  groups: string[];
  focus: FocusState;
};

type ProjectSeed = [ref: string, name: string, key: string, color: string, area: Project["area"]];

const PROJECTS: ProjectSeed[] = [
  ["web", "Website khách hàng", "WEB", "#4c6a92", "work"],
  ["ops", "Vận hành nội bộ", "OPS", "#2f7f7a", "work"],
  ["home", "Gia đình", "NHA", "#b7704f", "personal"],
  ["health", "Sức khoẻ", "SK", "#7a8b3a", "personal"],
];

type TaskSeed = {
  ref: string;
  project: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  description?: string;
  start?: number;
  due?: number;
  dueTime?: string;
  estimate?: number;
  tags?: string[];
  checklist?: [string, boolean][];
  comments?: string[];
  logged?: number[];
  doneDaysAgo?: number;
  recurrence?: Task["recurrence"];
  blockedBy?: string[];
};

const TASKS: TaskSeed[] = [
  { ref: "scope", project: "web", title: "Chốt phạm vi giai đoạn 2 với khách", status: "doing", priority: "high",
    description: "Thống nhất danh sách tính năng, mốc bàn giao và chi phí phát sinh.\n\n- Gửi bản ước lượng trước buổi họp\n- Ghi biên bản và xin xác nhận qua email",
    start: -3, due: 1, estimate: 3, tags: ["họp"], logged: [90],
    checklist: [["Tổng hợp yêu cầu", true], ["Ước lượng effort", true], ["Gửi biên bản", false]],
    comments: ["Khách muốn thêm cổng thanh toán nội địa, cần tách thành change request."] },
  { ref: "checkout", project: "web", title: "Thiết kế lại trang thanh toán", status: "todo", priority: "high",
    start: 2, due: 8, estimate: 12, tags: ["ui"], blockedBy: ["scope"] },
  { ref: "login", project: "web", title: "Sửa lỗi đăng nhập Google trên Safari", status: "todo", priority: "urgent",
    description: "Popup bị chặn trên Safari 18, cần chuyển sang redirect flow.", due: 0, dueTime: "17:00", estimate: 2, tags: ["bug"] },
  { ref: "api-doc", project: "web", title: "Viết tài liệu API cho đối tác", status: "backlog", priority: "medium", due: 14, estimate: 6, tags: ["tài liệu"] },
  { ref: "demo", project: "web", title: "Demo sprint cho khách hàng", status: "todo", priority: "medium", start: 4, due: 5, dueTime: "15:00", estimate: 1.5, tags: ["họp"] },
  { ref: "perf", project: "web", title: "Kiểm thử hiệu năng trang chủ", status: "done", priority: "medium", start: -7, due: -3, estimate: 4, logged: [120, 110, 70], doneDaysAgo: 2 },
  { ref: "ci", project: "web", title: "Cấu hình CI/CD cho staging", status: "done", priority: "high", start: -9, due: -6, estimate: 5, logged: [150, 90], doneDaysAgo: 5 },
  { ref: "weekly", project: "ops", title: "Báo cáo tuần cho ban giám đốc", status: "todo", priority: "high", due: 5, estimate: 1, tags: ["báo cáo"], recurrence: { freq: "weekly", interval: 1 } },
  { ref: "hiring", project: "ops", title: "Phỏng vấn 2 ứng viên BA", status: "doing", priority: "medium", start: -1, due: 2, estimate: 2, tags: ["tuyển dụng"], logged: [45] },
  { ref: "license", project: "ops", title: "Gia hạn license phần mềm thiết kế", status: "backlog", priority: "low", due: 20, estimate: 0.5 },
  { ref: "onboard", project: "ops", title: "Rà soát quy trình onboarding nhân sự mới", status: "done", priority: "medium", start: -12, due: -8, estimate: 3, logged: [150], doneDaysAgo: 7 },
  { ref: "bills", project: "home", title: "Đóng tiền điện nước", status: "todo", priority: "high", due: 2, estimate: 0.5, tags: ["hoá đơn"], recurrence: { freq: "monthly", interval: 1 } },
  { ref: "gift", project: "home", title: "Mua quà sinh nhật mẹ", status: "todo", priority: "medium", due: 4, estimate: 1, checklist: [["Chọn quà", false], ["Viết thiệp", false]] },
  { ref: "market", project: "home", title: "Đi chợ cuối tuần", status: "todo", priority: "medium", due: 6, estimate: 1.5 },
  { ref: "paint", project: "home", title: "Sơn lại phòng khách", status: "backlog", priority: "low", start: 10, due: 12, estimate: 8 },
  { ref: "grandma", project: "home", title: "Gọi điện hỏi thăm ông bà", status: "done", priority: "medium", due: -1, doneDaysAgo: 1 },
  { ref: "swim", project: "home", title: "Đưa con đi học bơi", status: "done", priority: "medium", due: 0, estimate: 2, doneDaysAgo: 0 },
  { ref: "checkup", project: "health", title: "Khám sức khoẻ định kỳ", status: "backlog", priority: "medium", due: 9, estimate: 2 },
  { ref: "dentist", project: "health", title: "Đặt lịch tái khám nha khoa", status: "todo", priority: "medium", due: -1 },
  { ref: "book", project: "", title: "Đọc 'Deep Work' chương 3", status: "todo", priority: "low", tags: ["đọc"] },
  { ref: "idea", project: "", title: "Ý tưởng: tự động hoá báo cáo tuần bằng AI", status: "backlog", priority: "medium", tags: ["ý tưởng"] },
  { ref: "library", project: "", title: "Trả sách cho thư viện", status: "doing", priority: "high", due: -1 },
];

const SAMPLE_NOTES: [title: string, content: string, project: string, pinned: boolean][] = [
  ["Ghi chú tuần", `## Tuần này
- Chốt phạm vi giai đoạn 2 trước thứ Hai
- Đặt lịch cắt tóc cuối tuần
- Nhắc con làm bài tập về nhà

## Cần nhớ
- Sinh nhật mẹ ngày 20, đặt bánh kem
- Đóng học phí cho con đầu tháng`, "", true],
  ["Kickoff giai đoạn 2", `Họp với khách **Website khách hàng**.

## Quyết định
- [x] Giữ nguyên stack hiện tại
- [x] Bàn giao theo sprint 2 tuần
- [ ] Chốt cổng thanh toán nội địa

## Mốc chính
| Mốc | Ngày | Ghi chú |
|---|---|---|
| Chốt phạm vi | Tuần này | Cần biên bản |
| Demo sprint 1 | Tuần sau | 15:00 |`, "web", false],
  ["Ý tưởng cho năm tới", `- Học một khoá quản trị dự án nâng cao
- Chạy bộ 3 buổi/tuần
- Viết blog chia sẻ kinh nghiệm quản lý dự án`, "", false],
];

const SAMPLE_BOOKMARKS: [string, string, string][] = [
  ["https://mail.google.com", "Gmail", "Hằng ngày"],
  ["https://calendar.google.com", "Google Lịch", "Hằng ngày"],
  ["https://www.google.com/maps", "Google Maps", "Hằng ngày"],
  ["https://github.com", "GitHub", "Công việc"],
  ["https://www.figma.com", "Figma", "Công việc"],
  ["https://www.notion.so", "Notion", "Công việc"],
  ["https://vnexpress.net", "VnExpress", "Tin tức"],
  ["https://tuoitre.vn", "Tuổi Trẻ", "Tin tức"],
  ["https://shopee.vn", "Shopee", "Mua sắm"],
  ["https://tiki.vn", "Tiki", "Mua sắm"],
  ["https://www.cooky.vn", "Cooky - Công thức nấu ăn", "Nấu ăn"],
  ["https://www.youtube.com", "YouTube", ""],
];

/** Build a complete, internally consistent demo workspace relative to `today`. */
export function buildSampleData(today = todayIso(), now = Date.now()): SampleData {
  const startOfToday = new Date(today + "T09:00:00").getTime();
  const projectIds = new Map(PROJECTS.map(([ref]) => [ref, createId()]));
  const projects: Project[] = PROJECTS.map(([ref, name, key, color, area], i) => ({
    id: projectIds.get(ref)!, name, key, color, area, description: "", archived: false,
    createdAt: now - (60 - i) * DAY,
  }));

  const taskIds = new Map(TASKS.map((t) => [t.ref, createId()]));
  const counters = new Map<string, number>();
  const tasks = TASKS.map((seed, i) => buildTask(seed, i));

  function buildTask(seed: TaskSeed, i: number): Task {
    const projectId = seed.project ? projectIds.get(seed.project)! : "";
    const number = (counters.get(projectId) ?? 0) + 1;
    counters.set(projectId, number);
    const createdAt = now - (30 - i) * DAY;
    const doneAt = seed.doneDaysAgo !== undefined ? startOfToday - seed.doneDaysAgo * DAY + 3_600_000 : undefined;
    return {
      id: taskIds.get(seed.ref)!,
      number, projectId,
      title: seed.title,
      description: seed.description ?? "",
      status: seed.status,
      priority: seed.priority,
      startDate: seed.start !== undefined ? addDaysIso(today, seed.start) : "",
      dueDate: seed.due !== undefined ? addDaysIso(today, seed.due) : "",
      dueTime: seed.dueTime ?? "",
      estimatedHours: seed.estimate,
      tags: seed.tags ?? [],
      checklist: (seed.checklist ?? []).map(([text, done]) => ({ id: createId(), text, done })),
      comments: (seed.comments ?? []).map((text, k) => ({ id: createId(), text, at: now - (k + 1) * 3_600_000 })),
      timeLogs: (seed.logged ?? []).map((minutes, k) => ({
        id: createId(), minutes, at: (doneAt ?? now) - (k + 1) * DAY, source: k % 2 ? "manual" : "focus",
      })),
      activity: [
        { id: createId(), at: createdAt, kind: "created" },
        ...(doneAt ? [{ id: createId(), at: doneAt, kind: "status" as const, from: "doing", to: "done" }] : []),
      ],
      recurrence: seed.recurrence,
      blockedBy: (seed.blockedBy ?? []).map((ref) => taskIds.get(ref)!),
      createdAt,
      updatedAt: doneAt ?? createdAt,
      doneAt,
    };
  }

  const notes: Note[] = SAMPLE_NOTES.map(([title, content, project, pinned], i) => ({
    id: createId(), title, content, projectId: project ? projectIds.get(project)! : "", pinned,
    createdAt: now - (10 - i) * DAY, updatedAt: now - i * 3_600_000,
  }));

  const habits: Habit[] = [
    { id: createId(), name: "Uống đủ 2 lít nước", done: [0, -1, -2, -3, -5].map((d) => addDaysIso(today, d)) },
    { id: createId(), name: "Đọc sách 20 phút", done: [-1, -2, -4].map((d) => addDaysIso(today, d)) },
    { id: createId(), name: "Tập thể dục", done: [0, -1, -3, -4, -6].map((d) => addDaysIso(today, d)) },
    { id: createId(), name: "Không dùng điện thoại sau 22h", done: [-2].map((d) => addDaysIso(today, d)) },
  ];

  const bookmarks: Bookmark[] = SAMPLE_BOOKMARKS.map(([url, title, group], i) => ({
    id: createId(), url, title, group, createdAt: SAMPLE_BOOKMARKS.length - i,
  }));
  const groups = [...new Set(SAMPLE_BOOKMARKS.map(([, , g]) => g).filter(Boolean))];

  // A week of focus sessions so Insights has a trend to draw.
  const sessions: FocusSession[] = [];
  const focusTasks = ["scope", "login", "hiring", "perf"].map((r) => taskIds.get(r)!);
  [3, 2, 4, 1, 3, 0, 2].forEach((count, dayIndex) => {
    for (let k = 0; k < count; k++) {
      sessions.push({
        at: startOfToday - (6 - dayIndex) * DAY + k * 45 * 60_000,
        minutes: 25,
        taskId: focusTasks[(dayIndex + k) % focusTasks.length],
      });
    }
  });

  return {
    projects, tasks, notes, habits, bookmarks, groups,
    focus: { ...initialFocus(), sessions },
  };
}

/** Write a full demo dataset into storage (no reload). */
export function writeSampleData() {
  const data = buildSampleData();
  const store = window.localStorage;
  store.setItem(DATA_KEYS.projects, JSON.stringify(data.projects));
  store.setItem(DATA_KEYS.todos, JSON.stringify(data.tasks));
  store.setItem(DATA_KEYS.notes, JSON.stringify(data.notes));
  store.setItem(DATA_KEYS.habits, JSON.stringify(data.habits));
  store.setItem(DATA_KEYS.bookmarks, JSON.stringify(data.bookmarks));
  store.setItem(DATA_KEYS.groups, JSON.stringify(data.groups));
  store.setItem(DATA_KEYS.focus, JSON.stringify(data.focus));
  store.removeItem(LEGACY_NOTE_KEY);
}

/** Seed a demo dataset only if the workspace has never held tasks. */
export function seedSampleDataIfEmpty() {
  if (window.localStorage.getItem(DATA_KEYS.todos) === null) writeSampleData();
}

/** Overwrite every tracker with a full demo dataset, then reload to render it. */
export function createSampleData() {
  // Stop in-memory stores (debounced notes) from flushing stale data during
  // the reload's pagehide.
  suspendPersistence();
  writeSampleData();
  window.location.reload();
}

/** Clear all tracker data and reload, keeping personalization settings. */
export function clearData() {
  suspendPersistence();
  for (const key of [...Object.values(DATA_KEYS), LEGACY_NOTE_KEY]) {
    window.localStorage.removeItem(key);
  }
  // An empty list (not a missing key) so the next load doesn't re-seed demos.
  window.localStorage.setItem(DATA_KEYS.todos, "[]");
  window.location.reload();
}

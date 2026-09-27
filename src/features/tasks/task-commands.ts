import { toast } from "sonner";
import { taskActions } from "./task-store";
import type { Task } from "./task-types";

/** Complete (or reopen) with an undo toast. */
export function toggleDone(task: Task, keyLabel: string) {
  const previous = task.status;
  const done = previous !== "done";
  taskActions.patch(task.id, { status: done ? "done" : "todo" });
  toast(done ? `Đã hoàn thành ${keyLabel}` : `Đã mở lại ${keyLabel}`, {
    action: { label: "Hoàn tác", onClick: () => taskActions.patch(task.id, { status: previous }) },
  });
}

import { describe, expect, it } from "vitest";
import { mergeVisibleOrder } from "./board-order";
import type { Task } from "./task-types";

const t = (id: string, status: Task["status"] = "todo") => ({ id, status }) as Task;

describe("mergeVisibleOrder", () => {
  it("reorders only the visible slots, leaving hidden tasks in place", () => {
    const all = [t("a"), t("x"), t("b"), t("y"), t("c")];
    const out = mergeVisibleOrder(all, [t("c"), t("a", "doing"), t("b")]);
    expect(out.map((x) => x.id)).toEqual(["c", "x", "a", "y", "b"]);
    expect(out[2].status).toBe("doing");
  });

  it("is a no-op for an empty subset", () => {
    const all = [t("a")];
    expect(mergeVisibleOrder(all, [])).toEqual(all);
  });
});

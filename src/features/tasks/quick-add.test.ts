import { describe, expect, it } from "vitest";
import type { Project } from "../projects/project-types";
import { parseDueWord, parseQuickAdd, parseTimeWord } from "./quick-add";

const today = "2026-09-27"; // Sunday
const projects: Project[] = [
  { id: "w", name: "Website khách", key: "WEB", color: "#000000", area: "work", description: "", archived: false, createdAt: 0 },
  { id: "h", name: "Nhà cửa", key: "NC", color: "#000000", area: "personal", description: "", archived: false, createdAt: 0 },
];
const parse = (s: string) => parseQuickAdd(s, { projects, today });

describe("parseDueWord", () => {
  it.each([
    ["homnay", "2026-09-27"],
    ["hôm-nay", "2026-09-27"],
    ["mai", "2026-09-28"],
    ["mốt", "2026-09-29"],
    ["t2", "2026-09-28"],
    ["cn", "2026-10-04"], // today is Sunday → next Sunday
    ["tuansau", "2026-09-28"],
    ["+3", "2026-09-30"],
    ["+10d", "2026-10-07"],
    ["25/12", "2026-12-25"],
    ["1/1", "2027-01-01"], // already past this year → next year
    ["5/10/27", "2027-10-05"],
    ["15/3/2028", "2028-03-15"],
  ])("resolves %s", (word, iso) => {
    expect(parseDueWord(word, today)).toBe(iso);
  });

  it.each(["31/2", "xyz", "13/13"])("rejects %s", (word) => {
    expect(parseDueWord(word, today)).toBeNull();
  });
});

describe("parseTimeWord", () => {
  it("normalizes times", () => {
    expect(parseTimeWord("9h")).toBe("09:00");
    expect(parseTimeWord("14h30")).toBe("14:30");
    expect(parseTimeWord("14:05")).toBe("14:05");
    expect(parseTimeWord("25h")).toBeNull();
    expect(parseTimeWord("mai")).toBeNull();
  });
});

describe("parseQuickAdd", () => {
  it("extracts every token and leaves a clean title", () => {
    const r = parse("Sửa lỗi đăng nhập #bug #web !cao @mai @14h +WEB ~1h30 *dang");
    expect(r).toMatchObject({
      title: "Sửa lỗi đăng nhập",
      tags: ["bug", "web"],
      priority: "high",
      dueDate: "2026-09-28",
      dueTime: "14:00",
      projectId: "w",
      estimatedHours: 1.5,
      status: "doing",
    });
    expect(r.tokens.map((t) => t.kind)).toEqual([
      "tag", "tag", "priority", "due", "time", "project", "estimate", "status",
    ]);
  });

  it("matches projects by name without spaces and accents", () => {
    expect(parse("Lau nhà +nhacua").projectId).toBe("h");
  });

  it("keeps unknown sigil words in the title", () => {
    const r = parse("Email @someone +unknown !maybe # ~x");
    expect(r.title).toBe("Email @someone +unknown !maybe # ~x");
    expect(r.tokens).toEqual([]);
  });

  it("uses today when only a time is given", () => {
    expect(parse("Họp @9h")).toMatchObject({ dueDate: today, dueTime: "09:00" });
  });

  it("dedupes tags and reads bare estimates as hours", () => {
    expect(parse("x #a #a ~2")).toMatchObject({ tags: ["a"], estimatedHours: 2 });
  });

  it("supports urgent and low priority words", () => {
    expect(parse("x !khẩn").priority).toBe("urgent");
    expect(parse("x !thấp").priority).toBe("low");
  });
});

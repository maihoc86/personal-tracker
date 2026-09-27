import { describe, expect, it } from "vitest";
import { cleanKey, migrateProjects, suggestKey } from "./project-types";

describe("cleanKey", () => {
  it("keeps only upper-case ASCII letters and digits", () => {
    expect(cleanKey("web-2 đồ")).toBe("WEB2DO");
    expect(cleanKey("abcdefgh")).toBe("ABCDEF");
  });
});

describe("suggestKey", () => {
  it("derives a key from the name", () => {
    expect(suggestKey("Website khách hàng", [])).toBe("WKH");
  });

  it("avoids taken keys and the inbox key", () => {
    expect(suggestKey("Website khách hàng", ["WKH"])).toBe("WKH2");
    expect(suggestKey("Inbox", [])).toBe("INBO");
    expect(suggestKey("In Nhanh Bảng", [])).toBe("INB2");
  });

  it("falls back to DA for names without letters", () => {
    expect(suggestKey("!!!", [])).toBe("DA");
  });
});

describe("migrateProjects", () => {
  it("sanitizes fields and drops invalid or duplicate entries", () => {
    const out = migrateProjects([
      { id: "p1", name: "Website", key: "web", color: "#123456", area: "work", createdAt: 5 },
      { id: "p2", name: "Nhà cửa", color: "red", area: "personal", archived: true },
      { id: "p1", name: "dupe" },
      { name: "no id" },
      "junk",
    ]);
    expect(out).toEqual([
      {
        id: "p1",
        name: "Website",
        key: "WEB",
        color: "#123456",
        area: "work",
        description: "",
        archived: false,
        createdAt: 5,
      },
      {
        id: "p2",
        name: "Nhà cửa",
        key: "NC",
        color: "#b7704f",
        area: "personal",
        description: "",
        archived: true,
        createdAt: 0,
      },
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(migrateProjects("x")).toEqual([]);
  });
});

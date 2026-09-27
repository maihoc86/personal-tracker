import { describe, expect, it } from "vitest";
import { deriveKey, foldText, matchesQuery } from "./text";

describe("foldText", () => {
  it("strips Vietnamese diacritics and lower-cases", () => {
    expect(foldText("Sức Khỏe")).toBe("suc khoe");
    expect(foldText("Đường đi")).toBe("duong di");
  });

  it("trims surrounding whitespace", () => {
    expect(foldText("  Hà Nội ")).toBe("ha noi");
  });
});

describe("matchesQuery", () => {
  it("matches every term regardless of accents and order", () => {
    expect(matchesQuery("Khám sức khỏe định kỳ", "suc kham")).toBe(true);
  });

  it("fails when any term is missing", () => {
    expect(matchesQuery("Khám sức khỏe", "kham rang")).toBe(false);
  });

  it("treats an empty query as a match", () => {
    expect(matchesQuery("anything", "   ")).toBe(true);
  });
});

describe("deriveKey", () => {
  it("uses initials for multi-word names", () => {
    expect(deriveKey("Website khách hàng")).toBe("WKH");
  });

  it("uses the first letters of a single word", () => {
    expect(deriveKey("Marketing")).toBe("MARK");
  });

  it("drops symbols and handles đ", () => {
    expect(deriveKey("Đội ngũ & vận hành")).toBe("DNVH");
  });

  it("returns empty for blank input", () => {
    expect(deriveKey("  ")).toBe("");
  });
});

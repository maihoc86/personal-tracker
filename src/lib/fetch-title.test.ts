import { describe, expect, it } from "vitest";
import { publicPart } from "./fetch-title";

describe("publicPart", () => {
  it("drops query strings and fragments before a URL leaves the browser", () => {
    expect(publicPart("https://example.com/reset?token=secret#x")).toBe("https://example.com/reset");
  });

  it("rejects non-http(s) and invalid URLs", () => {
    expect(publicPart("javascript:alert(1)")).toBe("");
    expect(publicPart("not a url")).toBe("");
  });
});

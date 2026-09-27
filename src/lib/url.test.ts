import { describe, expect, it } from "vitest";
import { faviconUrl, hostname, normalizeUrl, tidyTitle, titleFromUrl } from "./url";

describe("url helpers", () => {
  it("normalizes bare domains", () => {
    expect(normalizeUrl(" github.com ")).toBe("https://github.com");
    expect(normalizeUrl("http://a.vn")).toBe("http://a.vn");
    expect(normalizeUrl("  ")).toBe("");
  });

  it("extracts hostnames and titles", () => {
    expect(hostname("https://www.vnexpress.net/abc")).toBe("vnexpress.net");
    expect(hostname("nope")).toBe("nope");
    expect(titleFromUrl("https://www.github.com")).toBe("Github");
    expect(faviconUrl("https://tiki.vn/x")).toContain("domain=tiki.vn");
  });

  it("tidies verbose page titles", () => {
    expect(tidyTitle("Stripe | Financial Infrastructure")).toBe("Stripe");
    expect(tidyTitle("A - B")).toBe("A - B");
  });
});

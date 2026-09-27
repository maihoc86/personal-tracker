import { beforeEach, describe, expect, it } from "vitest";
import {
  buildHash,
  closeTask,
  openTask,
  parseHash,
  routeKey,
  sameRoute,
} from "./router";

describe("parseHash", () => {
  it("defaults to today", () => {
    expect(parseHash("").route).toEqual({ name: "today" });
    expect(parseHash("#/nope").route).toEqual({ name: "today" });
  });

  it("parses simple pages", () => {
    expect(parseHash("#/inbox").route).toEqual({ name: "inbox" });
    expect(parseHash("#/insights").route).toEqual({ name: "insights" });
  });

  it("parses projects and notes with ids", () => {
    expect(parseHash("#/project/a%20b").route).toEqual({ name: "project", id: "a b" });
    expect(parseHash("#/notes/n1").route).toEqual({ name: "notes", id: "n1" });
    expect(parseHash("#/notes").route).toEqual({ name: "notes" });
  });

  it("reads the query string", () => {
    expect(parseHash("#/tasks?task=t1").query.get("task")).toBe("t1");
  });
});

describe("buildHash", () => {
  it("round-trips routes and drops empty query values", () => {
    const hash = buildHash({ name: "project", id: "p 1" }, { task: "t1", x: undefined });
    expect(hash).toBe("#/project/p%201?task=t1");
    expect(parseHash(hash).route).toEqual({ name: "project", id: "p 1" });
  });
});

describe("task query helpers", () => {
  beforeEach(() => {
    window.location.hash = "#/inbox";
  });

  it("opens and closes the task panel on the current page", () => {
    openTask("t9");
    expect(window.location.hash).toBe("#/inbox?task=t9");
    closeTask();
    expect(window.location.hash).toBe("#/inbox");
  });
});

describe("routeKey", () => {
  it("distinguishes projects", () => {
    expect(routeKey({ name: "project", id: "a" })).toBe("project:a");
    expect(sameRoute({ name: "inbox" }, { name: "inbox" })).toBe(true);
    expect(sameRoute({ name: "project", id: "a" }, { name: "project", id: "b" })).toBe(false);
  });
});

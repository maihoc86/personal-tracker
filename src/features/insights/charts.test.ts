import { describe, expect, it } from "vitest";
import { niceMax } from "./insight-selectors";

describe("niceMax", () => {
  it.each([
    [0, 2],
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
    [11, 20],
    [23, 40],
    [180, 200],
  ])("rounds %d up to %d", (value, max) => {
    expect(niceMax(value)).toBe(max);
  });
});

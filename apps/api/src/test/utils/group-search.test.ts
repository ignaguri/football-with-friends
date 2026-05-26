import { describe, expect, test } from "bun:test";
import { scoreGroupMatch } from "@repo/shared/utils";

describe("scoreGroupMatch", () => {
  test("exact match (case/diacritic-insensitive) scores highest", () => {
    expect(scoreGroupMatch("Fútbol", "futbol")).toBeGreaterThanOrEqual(0.9);
    expect(scoreGroupMatch("sunday fc", "Sunday FC")).toBe(1);
  });

  test("prefix and substring beat distant matches", () => {
    expect(scoreGroupMatch("sun", "Sunday FC")).toBeGreaterThanOrEqual(0.8);
    expect(scoreGroupMatch("day", "Sunday FC")).toBeGreaterThanOrEqual(0.8);
  });

  test("typo still scores above threshold", () => {
    expect(scoreGroupMatch("sunbay", "Sunday")).toBeGreaterThanOrEqual(0.4);
  });

  test("unrelated query scores low", () => {
    expect(scoreGroupMatch("padel", "Sunday FC")).toBeLessThan(0.4);
  });

  test("empty query scores 0", () => {
    expect(scoreGroupMatch("", "Sunday FC")).toBe(0);
  });
});

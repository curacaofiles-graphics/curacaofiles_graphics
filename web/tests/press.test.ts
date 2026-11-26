import { describe, expect, it } from "vitest";

import { PRESS } from "../src/press";

describe("press list", () => {
  it("has unique https links and known kinds", () => {
    const urls = PRESS.map((item) => item.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const item of PRESS) {
      expect(item.url).toMatch(/^https:\/\//);
      expect(["article", "video"]).toContain(item.kind);
      expect(item.language).toMatch(/^[a-z]{2}$/);
    }
  });

  it("is oldest first within each kind", () => {
    for (const kind of ["article", "video"] as const) {
      const dates = PRESS.filter((item) => item.kind === kind && item.date).map((item) => item.date!);
      expect(dates).toEqual([...dates].sort());
    }
  });
});

import { describe, expect, it } from "vitest";

import { LANGUAGES, en } from "../src/locales";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locales", () => {
  it("are listed alphabetically by code, English included", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(codes).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
    expect(LANGUAGES.some((l) => l.code === "en")).toBe(true);
  });

  for (const lang of LANGUAGES) {
    it(`${lang.code} has every key, no extra keys and the same placeholders`, () => {
      expect(Object.keys(lang.dict).sort()).toEqual(Object.keys(en).sort());
      for (const [key, text] of Object.entries(en)) {
        const translated = lang.dict[key as keyof typeof en];
        expect(translated.trim(), key).not.toBe("");
        expect(placeholders(translated), key).toEqual(placeholders(text));
      }
    });
  }
});

import { describe, expect, it } from "vitest";

import { LANGUAGES, type Key } from "../src/locales";
import { isTerm, term } from "../src/terms";

const translator = (code: string) => {
  const dict = LANGUAGES.find((l) => l.code === code)!.dict;
  return (key: Key) => dict[key];
};

describe("register terms", () => {
  it.each([
    ["de", "Managing Director", "Geschäftsführer"],
    ["es", "Compliance Officer", "Responsable de cumplimiento"],
    ["fr", "Ultimate Beneficiary Owner", "Bénéficiaire effectif"],
    ["pl", "Chief Executive Officer", "Prezes (CEO)"],
    ["uk", "B2C Operator", "B2C-оператор"],
  ])("%s: %s -> %s", (code, word, expected) => {
    expect(term(translator(code), word)).toBe(expected);
  });

  it("keeps the register wording in English and for unknown words", () => {
    expect(term(translator("en"), "Managing Director")).toBe("Managing Director");
    expect(term(translator("it"), "Chief Happiness Officer")).toBe("Chief Happiness Officer");
    expect(term(translator("it"), null)).toBe("");
    expect(isTerm("Trustee")).toBe(true);
    expect(isTerm("Chief Happiness Officer")).toBe(false);
  });
});

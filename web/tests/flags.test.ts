import { describe, expect, it } from "vitest";

import { countryLabel, countrySearchText, flagCode, nativeName } from "../src/flags";

// [register spelling, ISO code], alphabetical. Covers the countries with the most people in the data
// and the register's long official spellings.
const CODES: [string, string][] = [
  ["Belarus", "by"],
  ["Bulgaria", "bg"],
  ["Curacao", "cw"],
  ["Cyprus", "cy"],
  ["Germany", "de"],
  ["Greece", "gr"],
  ["Ireland", "ie"],
  ["Isle of Man", "im"],
  ["Kazakhstan", "kz"],
  ["Korea, Republic of", "kr"],
  ["Macedonia, the Former Yugoslav Republic of", "mk"],
  ["Malta", "mt"],
  ["Moldova, Republic of", "md"],
  ["Netherlands", "nl"],
  ["Russian Federation", "ru"],
  ["Turkey", "tr"],
  ["Ukraine", "ua"],
  ["United Kingdom", "gb"],
  ["United States", "us"],
  ["Virgin Islands, British", "vg"],
];

// [register spelling, own name], alphabetical.
const OWN_NAMES: [string, string][] = [
  ["Bulgaria", "България"],
  ["Cyprus", "Κύπρος"],
  ["Germany", "Deutschland"],
  ["Greece", "Ελλάδα"],
  ["Hungary", "Magyarország"],
  ["Ireland", "Éire"],
  ["Netherlands", "Nederland"],
  ["Poland", "Polska"],
  ["Russian Federation", "Россия"],
  ["Spain", "España"],
  ["Ukraine", "Україна"],
];

describe("flags", () => {
  it("lists the cases alphabetically", () => {
    for (const list of [CODES, OWN_NAMES]) {
      const names = list.map(([name]) => name);
      expect(names).toEqual([...names].sort());
    }
  });

  it.each(CODES)("maps %s to %s", (country, code) => {
    expect(flagCode(country)).toBe(code);
  });

  it.each(["Netherlands Antilles", "Serbia and Montenegro", "Nowhere"])("has no flag for %s", (country) => {
    expect(flagCode(country)).toBeUndefined();
  });

  it.each(OWN_NAMES)("shows %s under its own name %s first", (country, own) => {
    expect(nativeName(country)).toBe(own);
    expect(countryLabel(country)).toBe(`${own} (${country})`);
  });

  it.each(["Australia", "Malta", "United Kingdom", "United States"])("keeps %s as is when the names match", (country) => {
    expect(countryLabel(country)).toBe(country);
  });

  it.each([
    ["Cyprus", "fr", ["cyprus", "κύπρος", "chypre"]],
    ["Germany", "es", ["germany", "deutschland", "alemania"]],
    ["Ukraine", "pl", ["ukraine", "україна", "ukraina"]],
  ] as [string, string, string[]][])("finds %s by every name (interface %s)", (country, ui, names) => {
    const text = countrySearchText(country, ui);
    for (const name of names) expect(text).toContain(name);
  });
});

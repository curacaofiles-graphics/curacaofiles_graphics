import { describe, expect, it } from "vitest";

import { buildGraph } from "../src/data";
import { countryPoint, geoView, homeCountries, jurisdictionPoint, neighbourhood } from "../src/map/geo";
import type { GraphData, PersonNode } from "../src/types";

const person = (id: string, label: string, passports: string[], residences: string[] = []): PersonNode => ({
  id,
  type: "person",
  label,
  nameKey: label.toLowerCase(),
  passports,
  residences,
  records: [],
});

function fixture(): GraphData {
  return {
    meta: { source: "", mirror: null, title: "", publisher: "", investigation: "", registers: {}, disclaimer: "", generated: "", nodeCounts: {}, edgeCounts: {} },
    nodes: [
      { id: "c:1", type: "company", label: "Alpha N.V.", companyId: 1 },
      { id: "c:2", type: "company", label: "Beta B.V.", companyId: 2 },
      person("p:1", "Anna Example", ["Germany"], ["Malta"]),
      person("p:2", "Ben Example", ["Cyprus"]),
      person("p:3", "Cleo Example", ["Ukraine"], ["Cyprus"]),
      person("p:4", "Dan Example", ["Netherlands Antilles"]),
      { id: "f:1", type: "foreign", label: "Gamma Ltd", jurisdiction: "Anjouan", licences: [] },
    ],
    edges: [
      { source: "p:1", target: "c:1", type: "role" },
      { source: "p:2", target: "c:1", type: "role" },
      { source: "p:3", target: "c:2", type: "role" },
      { source: "f:1", target: "c:1", type: "foreign_licence" },
    ],
  } as GraphData;
}

describe("points", () => {
  it.each(["Brazil", "Cyprus", "Georgia", "Malta", "Ukraine", "United States"])("places %s", (country) => {
    expect(countryPoint(country)).toHaveLength(2);
  });

  it("places the licensing jurisdictions", () => {
    for (const name of ["Anjouan", "Curaçao", "Kahnawà:ke"]) expect(jurisdictionPoint(name)).toHaveLength(2);
    expect(countryPoint("Netherlands Antilles")).toBeUndefined();
  });

  it("draws people at every residence and passport country", () => {
    const loaded = buildGraph(fixture());
    expect(homeCountries(loaded.nodes.get("p:1") as PersonNode)).toEqual(["Malta", "Germany"]);
    expect(homeCountries(loaded.nodes.get("p:2") as PersonNode)).toEqual(["Cyprus"]);
  });
});

describe("geoView", () => {
  it("counts people per country and companies per jurisdiction", () => {
    const view = geoView(buildGraph(fixture()), null);
    const byId = new Map(view.points.map((p) => [p.id, p]));
    expect(byId.get("country:Cyprus")?.people.sort()).toEqual(["p:2", "p:3"]);
    expect(byId.get("country:Malta")?.people).toEqual(["p:1"]);
    expect(byId.get("country:Germany")?.people).toEqual(["p:1"]); // the same person, also at their passport country
    expect(byId.get("country:Cyprus")).toMatchObject({ residents: 1, passportHolders: 1 });
    expect(byId.get("country:Ukraine")?.people).toEqual(["p:3"]);
    expect(byId.get("jurisdiction:Curaçao")?.entities.sort()).toEqual(["c:1", "c:2"]);
    expect(byId.get("jurisdiction:Anjouan")?.entities).toEqual(["f:1"]);
    expect(view.unplaced).toBe(1);
    expect(view.links).toContainEqual({ from: "country:Cyprus", to: "jurisdiction:Curaçao", weight: 2 });
    expect(view.links).toContainEqual({ from: "jurisdiction:Curaçao", to: "jurisdiction:Anjouan", weight: 1 });
  });

  it("highlights the selected person's countries, passports included", () => {
    const loaded = buildGraph(fixture());
    const view = geoView(loaded, neighbourhood(loaded, "p:1"), "p:1");
    const primary = view.points.filter((p) => p.primary).map((p) => p.name).sort();
    expect(primary).toEqual(["Germany", "Malta"]);
    expect(view.points.some((p) => p.people.includes("p:2"))).toBe(true); // met in the same company
    expect(view.points.some((p) => p.people.includes("p:3"))).toBe(false); // other company
  });

  it("keeps a company's people and foreign licence holders together", () => {
    const loaded = buildGraph(fixture());
    expect([...neighbourhood(loaded, "c:1")].sort()).toEqual(["c:1", "f:1", "p:1", "p:2"]);
  });
});

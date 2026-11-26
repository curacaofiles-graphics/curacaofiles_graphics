import { describe as group, expect, it } from "vitest";

import {
  buildGraph,
  collapseDomains,
  connections,
  describe,
  expandDomains,
  foreignKey,
  mirrorUrl,
  nationalities,
  nationalityFocus,
  personCountries,
  search,
} from "../src/data";
import type { Key } from "../src/locales";
import en from "../src/locales/en";
import type { CompanyNode, GraphData, PersonNode } from "../src/types";

// English strings with placeholders filled in, like the real translator.
const t = (key: Key, vars?: Record<string, string | number>) => {
  let text: string = en[key];
  for (const [name, value] of Object.entries(vars ?? {})) text = text.replaceAll(`{${name}}`, String(value));
  return text;
};

const person = (id: string, label: string, extra: Partial<PersonNode> = {}): PersonNode => ({
  id,
  type: "person",
  label,
  nameKey: label.toLowerCase(),
  passports: [],
  residences: [],
  records: [],
  ...extra,
});

function fixture(): GraphData {
  const alpha: CompanyNode = {
    id: "c:1",
    type: "company",
    label: "Alpha Games N.V.",
    companyId: 1,
    listType: "Licensed",
    aliases: ["Alpha Play"],
    domains: [
      { name: "alpha.example", status: "active", verified: true, added: null, since: null, parent: null, registrations: [] },
      { name: "shared.example", status: "deleted", verified: false, added: null, since: null, parent: null, registrations: [] },
    ],
  };
  const beta: CompanyNode = {
    id: "c:2",
    type: "company",
    label: "Beta Play B.V.",
    companyId: 2,
    domains: [{ name: "shared.example", status: "active", verified: false, added: null, since: null, parent: null, registrations: [] }],
  };
  return {
    meta: {
      source: "https://source.example",
      mirror: "https://mirror.example",
      title: "",
      publisher: "",
      investigation: "",
      registers: {},
      disclaimer: "",
      generated: "",
      nodeCounts: {},
      edgeCounts: {},
    },
    nodes: [
      alpha,
      beta,
      person("p:1", "Jane Doe", { passports: ["Malta"], residences: ["Cyprus"], nameCountries: ["United Kingdom"] }),
      person("p:2", "John Roe", { passports: ["Malta", "Cyprus"] }),
      person("p:3", "Ann Poe", { passports: ["Cyprus"] }),
      { id: "f:1", type: "foreign", label: "Gamma Ltd", jurisdiction: "Anjouan", licences: [] },
    ],
    edges: [
      { source: "p:1", target: "c:1", type: "role", label: "Director" },
      { source: "p:2", target: "c:2", type: "role", label: "Shareholder" },
      { source: "p:3", target: "c:2", type: "role", label: "UBO" },
      { source: "c:1", target: "c:2", type: "shared_domain", domains: ["shared.example"] },
      { source: "f:1", target: "c:1", type: "foreign_licence" },
    ],
  } as GraphData;
}

group("buildGraph", () => {
  it("indexes nodes, domains and foreign holders", () => {
    const loaded = buildGraph(fixture());
    expect(loaded.graph.order).toBe(6);
    expect(loaded.graph.size).toBe(5);
    expect(loaded.domainIndex.get("shared.example")).toEqual(["c:1", "c:2"]);
    expect(loaded.foreignIndex.get(foreignKey("Anjouan", "Gamma  Ltd"))).toBe("f:1");
  });

  it("skips edges to unknown nodes", () => {
    const data = fixture();
    data.edges.push({ source: "p:1", target: "c:404", type: "role" } as GraphData["edges"][number]);
    expect(buildGraph(data).graph.size).toBe(5);
  });
});

group("connections", () => {
  it("lists both directions", () => {
    const loaded = buildGraph(fixture());
    const links = connections(loaded, "c:2");
    expect(links.map((l) => l.other.id).sort()).toEqual(["c:1", "p:2", "p:3"]);
  });
});

group("domains", () => {
  it("adds and removes domain nodes of a company", () => {
    const loaded = buildGraph(fixture());
    const alpha = loaded.nodes.get("c:1") as CompanyNode;
    const before = loaded.graph.order;
    const added = expandDomains(loaded, alpha);
    expect(added.length).toBe(2);
    expect(loaded.graph.order).toBe(before + 2);
    collapseDomains(loaded, alpha);
    expect(loaded.graph.order).toBe(before);
  });
});

group("search", () => {
  it("finds labels, aliases and domains", () => {
    const loaded = buildGraph(fixture());
    expect(search(loaded, "jane", t)[0]).toMatchObject({ id: "p:1", hint: "Malta" });
    expect(search(loaded, "alpha play", t)[0]).toMatchObject({ id: "c:1", hint: "aka Alpha Play" });
    expect(search(loaded, "shared.ex", t).map((h) => h.id)).toEqual(["c:1", "c:2"]);
    expect(search(loaded, "a", t)).toEqual([]);
  });
});

group("describe", () => {
  it("uses register data first and translated fallbacks", () => {
    const loaded = buildGraph(fixture());
    expect(describe(loaded.nodes.get("c:1")!, t)).toBe("Licensed");
    expect(describe(loaded.nodes.get("c:2")!, t)).toBe("Company");
    expect(describe(loaded.nodes.get("f:1")!, t)).toBe("Anjouan licence holder");
  });
});

group("nationalities", () => {
  it("counts passports, optionally residence and name guesses", () => {
    const loaded = buildGraph(fixture());
    expect(nationalities(loaded, { residence: false, names: false })).toEqual([
      { name: "Cyprus", count: 2 },
      { name: "Malta", count: 2 },
    ]);
    const wide = nationalities(loaded, { residence: true, names: true });
    expect(wide).toContainEqual({ name: "Cyprus", count: 3 });
    expect(wide).toContainEqual({ name: "United Kingdom", count: 1 });
  });

  it("keeps a person once per country", () => {
    const jane = buildGraph(fixture()).nodes.get("p:1") as PersonNode;
    expect(personCountries(jane, { residence: true, names: false }).sort()).toEqual(["Cyprus", "Malta"]);
  });

  it("focuses on the chosen people and their companies", () => {
    const loaded = buildGraph(fixture());
    const focus = nationalityFocus(loaded, ["Cyprus"], { residence: false, names: false });
    expect(focus.nodes.has("p:2")).toBe(true);
    expect(focus.nodes.has("p:3")).toBe(true);
    expect(focus.nodes.has("c:2")).toBe(true);
    expect(focus.nodes.has("p:1")).toBe(false);
  });
});

group("mirrorUrl", () => {
  it("swaps the source host for the mirror", () => {
    const { meta } = fixture();
    expect(mirrorUrl(meta, "https://source.example/casinos/1-alpha")).toBe("https://mirror.example/casinos/1-alpha");
    expect(mirrorUrl(meta, "https://elsewhere.example/x")).toBeNull();
    expect(mirrorUrl(meta, null)).toBeNull();
  });
});

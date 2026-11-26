// Turns the graph into points and links on a world map.
//
// The source has no company addresses (the map markers on its company pages are empty), so companies are
// placed at their licensing jurisdiction: Curaçao for the register's companies, Anjouan or Kahnawà:ke for
// foreign licence holders. People are placed at the centre of every country they are tied to: residence
// countries and passport countries, so one person can appear in several places (the counts match the
// country panel). Links run from people's countries to the jurisdictions of the companies they are tied
// to, and between jurisdictions that list the same domains.
import { connections, type LoadedData } from "../data";
import { flagCode } from "../flags";
import type { DataNode, PersonNode } from "../types";
import centroids from "./centroids.json";

export type LonLat = [number, number];

const POINTS = centroids as unknown as Record<string, LonLat>;

/** Licensing jurisdictions -> point key in centroids.json. */
const JURISDICTIONS: Record<string, string> = {
  "Curaçao": "cw",
  Anjouan: "x-anjouan",
  "Kahnawà:ke": "x-kahnawake",
};
export const CURACAO = "Curaçao";

export function countryPoint(country: string): LonLat | undefined {
  const code = flagCode(country);
  return code ? POINTS[code] : undefined;
}

export function jurisdictionPoint(name: string): LonLat | undefined {
  const key = JURISDICTIONS[name];
  return key ? POINTS[key] : undefined;
}

export interface GeoPoint {
  /** "country:<name>" or "jurisdiction:<name>". */
  id: string;
  kind: "country" | "jurisdiction";
  name: string;
  at: LonLat;
  /** People placed here (living here or holding a passport from here). */
  people: string[];
  /** Of those, people with a residence here. */
  residents: number;
  /** Of those, people with a passport from here. */
  passportHolders: number;
  /** Companies (Curaçao) or foreign licence holders (other jurisdictions) placed here. */
  entities: string[];
  /** A country of the selected person. */
  primary?: boolean;
}

export interface GeoLink {
  from: string;
  to: string;
  /** How many people (country -> jurisdiction) or shared licences (jurisdiction -> jurisdiction). */
  weight: number;
  primary?: boolean;
}

export interface GeoView {
  points: GeoPoint[];
  links: GeoLink[];
  /** People whose countries have no point on the map. */
  unplaced: number;
}

/** Countries a person is drawn at: every residence and passport country, each once. */
export function homeCountries(person: PersonNode): string[] {
  return [...new Set([...person.residences, ...person.passports])];
}

/**
 * Everything worth drawing for a selected node: its people, companies and foreign licence holders, plus
 * the people and holders one company away.
 */
export function neighbourhood(loaded: LoadedData, id: string): Set<string> {
  const out = new Set<string>([id]);
  const node = loaded.nodes.get(id);
  if (!node) return out;
  const companiesOf = (nodeId: string) =>
    connections(loaded, nodeId)
      .filter(({ other }) => other.type === "company")
      .map(({ other }) => other.id);
  const around = (companyId: string) => {
    out.add(companyId);
    for (const { other } of connections(loaded, companyId)) {
      if (other.type === "person" || other.type === "foreign") out.add(other.id);
    }
  };
  if (node.type === "company") around(id);
  else if (node.type === "country") {
    for (const { other } of connections(loaded, id)) {
      if (other.type !== "person") continue;
      out.add(other.id);
      companiesOf(other.id).forEach((c) => out.add(c));
    }
  } else companiesOf(id).forEach(around);
  return out;
}

/**
 * Points and links for a set of node ids (`null` = the whole data set). `primary` marks one person whose
 * countries and links are highlighted.
 */
export function geoView(loaded: LoadedData, ids: Set<string> | null, primary?: string): GeoView {
  const points = new Map<string, GeoPoint>();
  const links = new Map<string, GeoLink>();
  let unplaced = 0;

  const point = (kind: GeoPoint["kind"], name: string, at: LonLat) => {
    const id = `${kind}:${name}`;
    let p = points.get(id);
    if (!p) {
      p = { id, kind, name, at, people: [], residents: 0, passportHolders: 0, entities: [] };
      points.set(id, p);
    }
    return p;
  };
  const link = (from: string, to: string, isPrimary = false) => {
    const key = `${from}|${to}`;
    const l = links.get(key) ?? { from, to, weight: 0 };
    l.weight += 1;
    if (isPrimary) l.primary = true;
    links.set(key, l);
  };

  const inView = (node: DataNode) => !ids || ids.has(node.id);
  const curacao = jurisdictionPoint(CURACAO)!;

  for (const node of loaded.nodes.values()) {
    if (!inView(node)) continue;
    if (node.type === "company") point("jurisdiction", CURACAO, curacao).entities.push(node.id);
    else if (node.type === "foreign") {
      const at = jurisdictionPoint(node.jurisdiction);
      if (at) point("jurisdiction", node.jurisdiction, at).entities.push(node.id);
    }
  }

  for (const node of loaded.nodes.values()) {
    if (node.type !== "person" || !inView(node)) continue;
    const isPrimary = node.id === primary;
    // The jurisdictions of the person's companies that are in view (all of them are in Curaçao).
    const linked = connections(loaded, node.id).some(({ other }) => other.type === "company" && inView(other));
    let placed = false;
    for (const country of homeCountries(node)) {
      const at = countryPoint(country);
      if (!at) continue;
      placed = true;
      const p = point("country", country, at);
      p.people.push(node.id);
      if (node.residences.includes(country)) p.residents += 1;
      if (node.passports.includes(country)) p.passportHolders += 1;
      if (isPrimary) p.primary = true;
      if (linked) link(p.id, `jurisdiction:${CURACAO}`, isPrimary);
    }
    if (!placed) unplaced += 1;
  }

  // Foreign licence holders that list the same domain as a company in view.
  for (const edge of loaded.edges) {
    if (edge.type !== "foreign_licence") continue;
    const foreign = loaded.nodes.get(edge.source.startsWith("f:") ? edge.source : edge.target);
    const company = loaded.nodes.get(edge.source.startsWith("f:") ? edge.target : edge.source);
    if (foreign?.type !== "foreign" || !company || !inView(foreign) || !inView(company)) continue;
    if (!jurisdictionPoint(foreign.jurisdiction)) continue;
    link(`jurisdiction:${CURACAO}`, `jurisdiction:${foreign.jurisdiction}`);
  }

  const list = [...points.values()].filter((p) => p.people.length || p.entities.length || p.primary);
  const shown = new Set(list.map((p) => p.id));
  return {
    points: list.sort((a, b) => b.people.length + b.entities.length - (a.people.length + a.entities.length)),
    links: [...links.values()].filter((l) => shown.has(l.from) && shown.has(l.to)),
    unplaced,
  };
}

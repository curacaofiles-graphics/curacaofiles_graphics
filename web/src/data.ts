import { MultiDirectedGraph } from "graphology";

import type { Key, Translate } from "./i18n";
import { term } from "./terms";
import type {
  CompanyDetailsFile,
  CompanyNode,
  DataEdge,
  DataNode,
  GraphData,
  GraphMeta,
  Highlights,
  Mention,
  NodeType,
  PersonNode,
} from "./types";

export interface NodeAttributes {
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  nodeType: NodeType;
}

export interface EdgeAttributes {
  edgeType: DataEdge["type"];
  size: number;
  color: string;
}

export type AppGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes>;

export const TYPE_LABELS: Record<NodeType, string> = {
  company: "Companies",
  person: "People",
  organization: "Organisations",
  foreign: "Foreign licence holders",
  country: "Countries",
  domain: "Domains",
};

export const TYPE_COLORS: Record<NodeType, string> = {
  company: "#6ea8fe",
  person: "#f87171",
  organization: "#22d3ee",
  foreign: "#a3a3a3",
  country: "#84cc16",
  domain: "#e5e7eb",
};

// Companies are coloured by the tab the source site lists them under.
export const COMPANY_COLORS: Record<string, string> = {
  "B2C Operator": "#6ea8fe",
  Holdings: "#a78bfa",
  "Master Licensor": "#f59e0b",
  "Official Representative": "#34d399",
  "Trust Services": "#f472b6",
};

export const EDGE_LABELS: Record<DataEdge["type"], Key> = {
  role: "edge.role",
  representative: "edge.representative",
  master_licensor: "edge.masterLicensor",
  related: "edge.related",
  shared_domain: "edge.sharedDomain",
  foreign_licence: "edge.foreignLicence",
  passport: "edge.passport",
  residence: "edge.residence",
  domain: "edge.domain",
};

export const DEFAULT_VISIBLE: NodeType[] = ["company", "person", "organization", "domain"];

export function nodeColor(node: DataNode): string {
  if (node.type === "company") {
    return COMPANY_COLORS[(node as CompanyNode).listType ?? ""] ?? "#94a3b8";
  }
  return TYPE_COLORS[node.type];
}

export interface LoadedData {
  meta: GraphMeta;
  graph: AppGraph;
  nodes: Map<string, DataNode>;
  edges: DataEdge[];
  domainIndex: Map<string, string[]>;
  highlights: Highlights;
  /** Node id -> the media mentions that name it. */
  mentionsByNode: Map<string, Mention[]>;
  /** "jurisdiction|holder name" (lower case) -> foreign licence holder node id. */
  foreignIndex: Map<string, string>;
}

export function foreignKey(jurisdiction: string, holder: string): string {
  return `${jurisdiction}|${holder}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function loadData(url: string): Promise<LoadedData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const data = (await response.json()) as GraphData;
  return buildGraph(data);
}

export function buildGraph(data: GraphData): LoadedData {
  const graph: AppGraph = new MultiDirectedGraph();
  const nodes = new Map<string, DataNode>();
  const count = data.nodes.length;

  data.nodes.forEach((node, index) => {
    nodes.set(node.id, node);
    // Golden-angle spiral: deterministic, evenly spread start positions for the layout.
    const angle = index * 2.399963;
    const radius = Math.sqrt(index / count) * 100;
    graph.addNode(node.id, {
      x: node.x ?? Math.cos(angle) * radius,
      y: node.y ?? Math.sin(angle) * radius,
      size: 2,
      color: nodeColor(node),
      label: node.label,
      nodeType: node.type,
    });
  });

  data.edges.forEach((edge, index) => {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
    graph.addEdgeWithKey(`e${index}`, edge.source, edge.target, {
      edgeType: edge.type,
      size: edge.type === "shared_domain" ? 1 + Math.min(4, (edge.domains?.length ?? 1) / 5) : 0.6,
      color: "#3b4252",
    });
  });

  graph.forEachNode((id, attrs) => {
    const degree = graph.degree(id);
    graph.setNodeAttribute(id, "size", Math.min(22, 2 + Math.sqrt(degree) * (attrs.nodeType === "company" ? 1.4 : 1.1)));
  });

  const domainIndex = new Map<string, string[]>();
  const addDomain = (domain: string, owner: string) => {
    const key = domain.toLowerCase();
    const owners = domainIndex.get(key);
    if (!owners) domainIndex.set(key, [owner]);
    else if (!owners.includes(owner)) owners.push(owner);
  };
  for (const node of nodes.values()) {
    if (node.type === "company") node.domains?.forEach((d) => addDomain(d.name, node.id));
    if (node.type === "foreign") node.licences.forEach((l) => addDomain(l.domain, node.id));
  }

  const highlights = data.highlights ?? { sources: [], mentions: [] };
  const mentionsByNode = new Map<string, Mention[]>();
  for (const mention of highlights.mentions) {
    for (const id of mention.nodes) {
      const list = mentionsByNode.get(id) ?? [];
      list.push(mention);
      mentionsByNode.set(id, list);
    }
  }

  const foreignIndex = new Map<string, string>();
  for (const node of nodes.values()) {
    if (node.type === "foreign") foreignIndex.set(foreignKey(node.jurisdiction, node.label), node.id);
  }

  return { meta: data.meta, graph, nodes, edges: data.edges, domainIndex, highlights, mentionsByNode, foreignIndex };
}

/** Edges touching a node, with the other end resolved. */
export function connections(loaded: LoadedData, id: string) {
  const out: { edge: DataEdge; other: DataNode; outgoing: boolean }[] = [];
  const { graph, nodes, edges } = loaded;
  if (!graph.hasNode(id)) return out;
  graph.forEachEdge(id, (key, _attrs, source, target) => {
    const index = Number(key.slice(1));
    const edge = edges[index];
    if (!edge) return;
    const otherId = source === id ? target : source;
    const other = nodes.get(otherId);
    if (other) out.push({ edge, other, outgoing: source === id });
  });
  return out;
}

/** Add a company's domains to the graph as leaf nodes around it. Returns the ids added. */
export function expandDomains(loaded: LoadedData, company: CompanyNode): string[] {
  const { graph, nodes } = loaded;
  const centre = graph.getNodeAttributes(company.id);
  const list = (company.domains ?? []).filter((d) => !d.parent);
  const added: string[] = [];
  list.forEach((domain, index) => {
    const id = `d:${domain.name}`;
    if (!graph.hasNode(id)) {
      const angle = (index / Math.max(1, list.length)) * Math.PI * 2;
      const node: DataNode = { id, type: "domain", label: domain.name, company: company.id };
      nodes.set(id, node);
      graph.addNode(id, {
        x: centre.x + Math.cos(angle) * 4,
        y: centre.y + Math.sin(angle) * 4,
        size: 2.5,
        color: domain.status === "active" ? TYPE_COLORS.domain : "#6b7280",
        label: domain.name,
        nodeType: "domain",
      });
      added.push(id);
    }
    if (!graph.hasEdge(company.id, id)) {
      graph.addEdge(company.id, id, { edgeType: "domain", size: 0.5, color: "#3b4252" });
    }
  });
  return added;
}

export function collapseDomains(loaded: LoadedData, company: CompanyNode): void {
  const { graph, nodes } = loaded;
  for (const domain of company.domains ?? []) {
    const id = `d:${domain.name}`;
    const node = nodes.get(id);
    if (node && node.type === "domain" && node.company === company.id && graph.hasNode(id)) {
      graph.dropNode(id);
      nodes.delete(id);
    }
  }
}

export interface SearchHit {
  id: string;
  label: string;
  type: NodeType;
  hint: string;
}

export function search(loaded: LoadedData, query: string, t: Translate, limit = 30): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const push = (hit: SearchHit) => {
    if (seen.has(hit.id) || hits.length >= limit) return;
    seen.add(hit.id);
    hits.push(hit);
  };

  for (const node of loaded.nodes.values()) {
    if (hits.length >= limit) break;
    if (node.type === "domain") continue;
    const label = node.label.toLowerCase();
    if (label.includes(q)) {
      push({ id: node.id, label: node.label, type: node.type, hint: describe(node, t) });
      continue;
    }
    if (node.type === "company") {
      const alias = node.aliases?.find((a) => a.toLowerCase().includes(q));
      if (alias) push({ id: node.id, label: node.label, type: node.type, hint: t("search.aka", { name: alias }) });
      else if (node.license?.toLowerCase().includes(q)) push({ id: node.id, label: node.label, type: node.type, hint: node.license });
    }
  }

  for (const [domain, owners] of loaded.domainIndex) {
    if (hits.length >= limit) break;
    if (!domain.includes(q)) continue;
    for (const owner of owners) {
      const node = loaded.nodes.get(owner);
      if (node) push({ id: owner, label: node.label, type: node.type, hint: `${t("edge.domain")} ${domain}` });
    }
  }
  return hits;
}

export function describe(node: DataNode, t: Translate): string {
  switch (node.type) {
    case "company":
      return term(t, node.listType ?? node.kind) || t("node.company");
    case "person":
      return [node.passports.join(" / "), node.birthMonth].filter(Boolean).join(" · ") || t("node.person");
    case "foreign":
      return t("node.foreign", { jurisdiction: node.jurisdiction });
    case "organization":
      return t("node.organization");
    case "country":
      return t("node.country");
    case "domain":
      return t("edge.domain");
  }
}

/** Same link on the mirror domain. */
export function mirrorUrl(meta: GraphMeta, url: string | null | undefined): string | null {
  if (!url || !meta.mirror || !url.startsWith(meta.source)) return null;
  return meta.mirror + url.slice(meta.source.length);
}

export interface Nationality {
  name: string;
  count: number;
}

export interface CountryMatch {
  /** Also count residence countries. */
  residence: boolean;
  /** Also count countries guessed from the name (heuristic). */
  names: boolean;
}

/** Countries a person is tied to under the chosen matching rules. */
export function personCountries(node: PersonNode, match: CountryMatch): string[] {
  const out = new Set(node.passports);
  if (match.residence) node.residences.forEach((c) => out.add(c));
  if (match.names) node.nameCountries?.forEach((c) => out.add(c));
  return [...out];
}

/** Countries with how many people are tied to each; most common first. A person can count for several. */
export function nationalities(loaded: LoadedData, match: CountryMatch): Nationality[] {
  const counts = new Map<string, number>();
  for (const node of loaded.nodes.values()) {
    if (node.type !== "person") continue;
    for (const country of personCountries(node, match)) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface NationalityFocus {
  countries: string[];
  /** Person ids per selected country, sorted by name. */
  byCountry: Map<string, string[]>;
  people: string[];
  /** The people plus every node directly connected to them. */
  nodes: Set<string>;
  companies: number;
  /** Companies linked to people of two or more of the selected countries. */
  shared: { company: string; countries: string[] }[];
  /** Colour per selected country (only when more than one is selected). */
  colors: Map<string, string>;
  /** Person id -> colour of their country (only when more than one is selected). */
  personColors: Map<string, string>;
}

// Distinct hues for telling selected nationalities apart; cycles after ten.
const COUNTRY_PALETTE = ["#f87171", "#fbbf24", "#a3e635", "#22d3ee", "#c084fc", "#fb923c", "#f472b6", "#2dd4bf", "#facc15", "#818cf8"];

export function nationalityFocus(loaded: LoadedData, countries: string[], match: CountryMatch): NationalityFocus {
  const { graph } = loaded;
  const wanted = new Set(countries);
  const byCountry = new Map<string, string[]>(countries.map((c) => [c, []]));
  for (const node of loaded.nodes.values()) {
    if (node.type !== "person") continue;
    for (const country of personCountries(node, match)) {
      if (wanted.has(country)) byCountry.get(country)!.push(node.id);
    }
  }
  const label = (id: string) => loaded.nodes.get(id)?.label ?? "";
  byCountry.forEach((ids) => ids.sort((a, b) => label(a).localeCompare(label(b))));
  const people = [...new Set([...byCountry.values()].flat())];

  const nodes = new Set(people);
  const companyCountries = new Map<string, Set<string>>();
  for (const [country, ids] of byCountry) {
    for (const id of ids) {
      if (!graph.hasNode(id)) continue;
      graph.forEachNeighbor(id, (other) => {
        const type = loaded.nodes.get(other)?.type;
        // Country nodes would be hubs of everyone selected (the filter already is the country) — leave them out.
        if (type === "country") return;
        nodes.add(other);
        if (type !== "company") return;
        const set = companyCountries.get(other) ?? new Set<string>();
        set.add(country);
        companyCountries.set(other, set);
      });
    }
  }
  const shared = [...companyCountries.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([company, set]) => ({ company, countries: countries.filter((c) => set.has(c)) }))
    .sort((a, b) => b.countries.length - a.countries.length || label(a.company).localeCompare(label(b.company)));
  const colors = new Map<string, string>();
  const personColors = new Map<string, string>();
  if (countries.length > 1) {
    countries.forEach((country, index) => {
      const color = COUNTRY_PALETTE[index % COUNTRY_PALETTE.length];
      colors.set(country, color);
      byCountry.get(country)?.forEach((id) => {
        if (!personColors.has(id)) personColors.set(id, color);
      });
    });
  }
  return { countries, byCountry, people, nodes, companies: companyCountries.size, shared, colors, personColors };
}

export interface CompanySummary {
  /** Domains recorded for the company (all statuses). */
  domains: number;
  /** Active domains as the source's list page counts them. */
  activeDomains: number | null;
  /** People linked to the company. */
  people: string[];
}

export function companySummary(loaded: LoadedData, id: string): CompanySummary {
  const node = loaded.nodes.get(id);
  const people: string[] = [];
  if (loaded.graph.hasNode(id)) {
    loaded.graph.forEachNeighbor(id, (other) => {
      if (loaded.nodes.get(other)?.type === "person") people.push(other);
    });
  }
  if (node?.type !== "company") return { domains: 0, activeDomains: null, people };
  return { domains: node.domains?.length ?? 0, activeDomains: node.activeDomains ?? null, people };
}

/** A person's companies, with the roles held in each, and the other people met there. */
export function personNetwork(loaded: LoadedData, person: PersonNode) {
  const byCompany = new Map<string, PersonNode["records"]>();
  for (const record of person.records) {
    const list = byCompany.get(record.company) ?? [];
    list.push(record);
    byCompany.set(record.company, list);
  }
  const companies = [...byCompany.entries()].map(([id, records]) => ({ id, records, summary: companySummary(loaded, id) }));
  const linked = new Set<string>();
  companies.forEach((c) => c.summary.people.forEach((p) => p !== person.id && linked.add(p)));
  const domains = companies.reduce((sum, c) => sum + c.summary.domains, 0);
  const activeDomains = companies.reduce((sum, c) => sum + (c.summary.activeDomains ?? 0), 0);
  return { companies, linked: [...linked], domains, activeDomains };
}

/** Nodes named in media mentions plus their people / company neighbours (the "Mentions" filter). */
export function mentionFocus(loaded: LoadedData): Set<string> {
  const nodes = new Set<string>();
  loaded.mentionsByNode.forEach((_mentions, id) => {
    if (!loaded.graph.hasNode(id)) return;
    nodes.add(id);
    // People <-> companies only; licensor / representative hubs would pull in hundreds of nodes.
    loaded.graph.forEachEdge(id, (_key, attrs, source, target) => {
      if (attrs.edgeType === "role" || attrs.edgeType === "shared_domain") nodes.add(source === id ? target : source);
    });
  });
  return nodes;
}

// ------------------------------------------------------- company details

const detailsCache = new Map<string, Promise<CompanyDetailsFile>>();

/** Documents and applications of one company, fetched once from `data/companies/<companyId>.json`. */
export function loadCompanyDetails(node: CompanyNode): Promise<CompanyDetailsFile> {
  let pending = detailsCache.get(node.id);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/companies/${node.companyId}.json`).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<CompanyDetailsFile>;
    });
    pending.catch(() => detailsCache.delete(node.id)); // allow a retry
    detailsCache.set(node.id, pending);
  }
  return pending;
}

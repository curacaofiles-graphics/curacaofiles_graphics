// Shape of web/public/data/graph.json, written by the Python scraper (scraper/src/curacao_scraper/graph.py).

export type NodeType = "company" | "person" | "organization" | "foreign" | "country" | "domain";

export interface Address {
  type: string | null;
  text: string;
  verified: boolean;
  status: string | null;
}

export interface DocumentLink {
  name: string;
  folder: string;
  size: string | null;
  type: string | null;
  preview: boolean;
  url: string | null;
}

export interface Registration {
  jurisdiction: string;
  holder: string;
  companyId?: number;
}

export interface Domain {
  /** Cleaned host name. */
  name: string;
  /** Value as the source has it, when it differs (spaces, paths…). */
  raw?: string;
  status: string | null;
  verified: boolean;
  added: string | null;
  since: string | null;
  parent: string | null;
  registrations: Registration[];
  /** Earlier status periods of the same domain (the register lists a re-added domain once per period). */
  history?: { status: string | null; added: string | null; since: string | null }[];
}

export interface TimelineStep {
  stage: string;
  date: string | null;
  reviewer: string | null;
  alias: string | null;
  info: string[];
}

export interface ChecklistItem {
  title: string;
  tag: string | null;
  criticality: string | null;
  due: string | null;
  description: string | null;
  notes: string | null;
}

export interface Application {
  license: string;
  status: string | null;
  submitted?: string;
  endDate?: string;
  customer: Record<string, string>;
  timeline: TimelineStep[];
  checklists: { name: string; criticality: string | null; items: ChecklistItem[] }[];
}

interface BaseNode {
  id: string;
  type: NodeType;
  label: string;
  /** Precomputed position (web/scripts/layout.mjs). */
  x?: number;
  y?: number;
}

export interface CompanyNode extends BaseNode {
  type: "company";
  companyId: number;
  slug?: string;
  url?: string;
  kind?: string;
  listType?: string;
  license?: string | null;
  aliases?: string[];
  registered?: string | null;
  activeDomains?: number | null;
  stats?: Record<string, number | string>;
  archive?: string | null;
  /** Sizes of the lists kept in `data/companies/<companyId>.json`, loaded when the company is opened. */
  detailCounts?: { documents?: number; applications?: number };
  domains?: Domain[];
  scraped?: boolean;
}

/** Contents of `data/companies/<companyId>.json`. */
export interface CompanyDetailsFile {
  documents?: DocumentLink[];
  applications?: Application[];
}

export interface PersonRecord {
  company: string;
  group: string;
  role: string | null;
  from: string | null;
  until: string | null;
  details: Record<string, string>;
  addresses: Address[];
}

export interface PersonNode extends BaseNode {
  type: "person";
  nameKey: string;
  birthMonth?: string;
  /** Every passport country seen in this person's filings. */
  passports: string[];
  /** Countries of the addresses in this person's filings. */
  residences: string[];
  /** Countries guessed from the name alone (heuristic, see scraper names.py). */
  nameCountries?: string[];
  /** Every birth month seen when filings with the same name and birth year were merged. */
  birthMonths?: string[];
  /** Why records were merged into this person, when they were. */
  mergedReason?: string;
  records: PersonRecord[];
  namesakes?: string[];
}

export interface OrganizationNode extends BaseNode {
  type: "organization";
  details?: Record<string, string>;
}

export interface ForeignLicence {
  domain: string;
  licence?: string | null;
  detail?: string | null;
  issued?: string | null;
  expires?: string | null;
}

export interface ForeignNode extends BaseNode {
  type: "foreign";
  jurisdiction: string;
  register?: string;
  licences: ForeignLicence[];
}

export interface CountryNode extends BaseNode {
  type: "country";
}

export interface DomainNode extends BaseNode {
  type: "domain";
  company: string;
}

export type DataNode = CompanyNode | PersonNode | OrganizationNode | ForeignNode | CountryNode | DomainNode;

export type EdgeType =
  | "role"
  | "representative"
  | "master_licensor"
  | "related"
  | "shared_domain"
  | "foreign_licence"
  | "passport"
  | "residence"
  | "domain";

export interface DataEdge {
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  role?: string;
  since?: string;
  until?: string;
  domains?: string[];
}

export interface GraphMeta {
  source: string;
  mirror: string | null;
  title: string;
  publisher: string;
  investigation: string;
  registers: Record<string, string>;
  disclaimer: string;
  generated: string;
  nodeCounts: Record<string, number>;
  edgeCounts: Record<string, number>;
  companyPagesMissing?: number;
  layout?: { algorithm: string; iterations: number };
}

export interface HighlightSource {
  id: string;
  kind?: string;
  title: string;
  publisher?: string;
  url: string;
  published?: string;
  language?: string;
  note?: string;
}

export interface Mention {
  source: string;
  time: string | null;
  url: string;
  claim: string;
  nodes: string[];
  unmatched: { type: string; name: string }[];
  other: string[];
  note?: string | null;
}

export interface Highlights {
  sources: HighlightSource[];
  mentions: Mention[];
}

export interface GraphData {
  meta: GraphMeta;
  nodes: DataNode[];
  edges: DataEdge[];
  highlights?: Highlights;
}

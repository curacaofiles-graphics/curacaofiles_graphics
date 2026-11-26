import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EDGE_LABELS,
  connections,
  describe,
  foreignKey,
  loadCompanyDetails,
  mirrorUrl,
  nodeColor,
  personNetwork,
  type CompanySummary,
  type LoadedData,
} from "../data";
import { Flag } from "../flags";
import { useI18n, type Key, type Translate } from "../i18n";
import { isTerm, term } from "../terms";
import { GamblingDomain } from "./LinkGate";
import { NodeMentions } from "./Mentions";
import type {
  Application,
  CompanyDetailsFile,
  CompanyNode,
  CountryNode,
  DataEdge,
  DataNode,
  DocumentLink,
  Domain,
  ForeignNode,
  OrganizationNode,
  PersonNode,
  PersonRecord,
} from "../types";

interface Props {
  loaded: LoadedData;
  node: DataNode;
  onSelect: (id: string) => void;
  onClose: () => void;
  expanded: boolean;
  onToggleDomains: (company: CompanyNode) => void;
}

type Link = ReturnType<typeof connections>[number];

// People first, then company-to-company links, then domain-based links.
const EDGE_ORDER: DataEdge["type"][] = [
  "role",
  "representative",
  "master_licensor",
  "related",
  "shared_domain",
  "foreign_licence",
  "passport",
  "residence",
  "domain",
];

export function SidePanel({ loaded, node, onSelect, onClose, expanded, onToggleDomains }: Props) {
  const { t } = useI18n();
  const links = useMemo(() => connections(loaded, node.id), [loaded, node.id]);
  return (
    <aside className="panel" aria-label={t("panel.details")}>
      <header className="panel-head">
        <span className="dot big" style={{ background: nodeColor(node) }} />
        <div>
          <h2>{node.label}</h2>
          <p className="muted">{describe(node, t)}</p>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label={t("action.close")}>
          ×
        </button>
      </header>
      <div className="panel-body">
        {node.type === "company" && (
          <CompanyDetails
            loaded={loaded}
            node={node}
            links={links}
            onSelect={onSelect}
            expanded={expanded}
            onToggleDomains={onToggleDomains}
          />
        )}
        {node.type === "person" && <PersonDetails loaded={loaded} node={node} onSelect={onSelect} />}
        {node.type === "organization" && <OrganizationDetails node={node} links={links} onSelect={onSelect} />}
        {node.type === "foreign" && <ForeignDetails loaded={loaded} node={node} links={links} onSelect={onSelect} />}
        {node.type === "country" && <CountryDetails node={node} links={links} onSelect={onSelect} />}
        {node.type === "domain" && <DomainDetails loaded={loaded} name={node.label} onSelect={onSelect} />}
      </div>
    </aside>
  );
}

// ------------------------------------------------------------------ pieces

function Section({ title, count, open = true, children }: { title: string; count?: number; open?: boolean; children: ReactNode }) {
  return (
    <details className="section" open={open}>
      <summary>
        {title}
        {count !== undefined && <span className="count">{count}</span>}
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

function NodeButton({ node, onSelect, children }: { node: DataNode; onSelect: (id: string) => void; children?: ReactNode }) {
  return (
    <button type="button" className="node-link" onClick={() => onSelect(node.id)}>
      <span className="dot" style={{ background: nodeColor(node) }} />
      <span className="node-link-text">
        <span>{node.label}</span>
        {children && <span className="muted small">{children}</span>}
      </span>
    </button>
  );
}

function SourceLinks({ loaded, url, label }: { loaded: LoadedData; url?: string | null; label?: string }) {
  const { t } = useI18n();
  if (!url) return null;
  const mirror = mirrorUrl(loaded.meta, url);
  return (
    <p className="source-links">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label ?? t("panel.sourcePage")} ↗
      </a>
      {mirror && (
        <a href={mirror} target="_blank" rel="noopener noreferrer" className="muted">
          {t("panel.mirror")} ↗
        </a>
      )}
    </p>
  );
}

/** A register word in the interface language, with the original wording as a tooltip. */
function Term({ value }: { value?: string | null }) {
  const { t } = useI18n();
  if (!value) return null;
  return isTerm(value) && term(t, value) !== value ? <span title={value}>{term(t, value)}</span> : <>{value}</>;
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!shown.length) return null;
  return (
    <dl className="facts">
      {shown.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function span(t: Translate, from?: string | null, until?: string | null) {
  if (!from && !until) return "";
  return `${from ?? "?"} → ${until ?? t("time.now")}`;
}

function edgeText(edge: DataEdge, t: Translate) {
  return [term(t, edge.role ?? edge.label) || t(EDGE_LABELS[edge.type]), span(t, edge.since, edge.until)].filter(Boolean).join(" · ");
}

function groupLinks(links: Link[], t: Translate) {
  const groups = new Map<string, Link[]>();
  for (const link of links) {
    let title = t(EDGE_LABELS[link.edge.type]);
    if (link.edge.type === "role") title = term(t, link.edge.label) || t("edge.role");
    if (link.edge.type === "representative") title = link.outgoing ? t("edge.representative") : t("edge.represents");
    if (link.edge.type === "master_licensor") title = link.outgoing ? t("edge.masterLicensor") : t("edge.licensesTo");
    const list = groups.get(title) ?? [];
    list.push(link);
    groups.set(title, list);
  }
  const order = (list: Link[]) => EDGE_ORDER.indexOf(list[0].edge.type);
  return [...groups.entries()].sort((a, b) => order(a[1]) - order(b[1]) || b[1].length - a[1].length);
}

function LinkGroups({
  links,
  onSelect,
  detail,
}: {
  links: Link[];
  onSelect: (id: string) => void;
  /** Replaces the default line under each linked node. */
  detail?: (link: Link) => ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      {groupLinks(links, t).map(([title, list]) => (
        <Section key={title} title={title} count={list.length} open={list.length <= 30}>
          <ul className="links">
            {list.map(({ edge, other, outgoing }, index) => (
              <li key={`${other.id}-${edge.type}-${index}`}>
                <NodeButton node={other} onSelect={onSelect}>
                  {detail ? detail({ edge, other, outgoing }) : edge.domains ? `${t("count.domains", { n: edge.domains.length })}: ${edge.domains.slice(0, 4).join(", ")}${edge.domains.length > 4 ? "…" : ""}` : edgeText(edge, t)}
                </NodeButton>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- company

function CompanyDetails({
  loaded,
  node,
  links,
  onSelect,
  expanded,
  onToggleDomains,
}: {
  loaded: LoadedData;
  node: CompanyNode;
  links: Link[];
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggleDomains: (company: CompanyNode) => void;
}) {
  const { t } = useI18n();
  const domains = node.domains ?? [];
  const details = useCompanyDetails(node);
  return (
    <>
      <Facts
        rows={[
          [t("panel.listedAs"), <Term value={node.listType} />],
          [t("panel.type"), <Term value={node.kind} />],
          [t("panel.licence"), node.license],
          [t("panel.aka"), node.aliases?.join(", ")],
          [t("panel.registered"), node.registered],
          [t("panel.activeDomains"), node.activeDomains ?? undefined],
          [t("panel.registerId"), node.companyId],
        ]}
      />
      <SourceLinks loaded={loaded} url={node.url} />
      <NodeMentions loaded={loaded} id={node.id} onSelect={onSelect} />
      {!node.scraped && <p className="muted small">{t("panel.notScraped")}</p>}
      <LinkGroups links={links} onSelect={onSelect} />
      {domains.length > 0 && (
        <Section title={t("panel.domains")} count={domains.length} open={false}>
          <button type="button" className="action" onClick={() => onToggleDomains(node)}>
            {expanded ? t("panel.hideDomains") : t("panel.showDomains")}
          </button>
          <DomainList loaded={loaded} company={node} domains={domains} onSelect={onSelect} />
        </Section>
      )}
      {(details.counts.applications ?? 0) > 0 && (
        <Section title={t("panel.licensing")} count={details.counts.applications} open={false}>
          <DetailsState state={details} />
          {details.file?.applications?.map((app, i) => (
            <ApplicationView key={app.license + i} app={app} />
          ))}
        </Section>
      )}
      {(details.counts.documents ?? 0) > 0 && (
        <Section title={t("panel.documents")} count={details.counts.documents} open={false}>
          <DetailsState state={details} />
          {details.file?.documents && <DocumentList loaded={loaded} docs={details.file.documents} archive={node.archive} />}
        </Section>
      )}
    </>
  );
}

type DetailsLoad = { counts: NonNullable<CompanyNode["detailCounts"]>; file?: CompanyDetailsFile; error?: boolean };

/** Documents and applications live in a separate file per company; fetch it when the company is opened. */
function useCompanyDetails(node: CompanyNode): DetailsLoad {
  const counts = node.detailCounts ?? {};
  const [state, setState] = useState<{ id: string; file?: CompanyDetailsFile; error?: boolean }>({ id: node.id });
  useEffect(() => {
    if (!node.detailCounts) return;
    let live = true;
    setState({ id: node.id });
    loadCompanyDetails(node).then(
      (file) => live && setState({ id: node.id, file }),
      () => live && setState({ id: node.id, error: true }),
    );
    return () => {
      live = false;
    };
  }, [node]);
  return state.id === node.id ? { counts, file: state.file, error: state.error } : { counts };
}

function DetailsState({ state }: { state: DetailsLoad }) {
  const { t } = useI18n();
  if (state.file) return null;
  return <p className="muted small">{state.error ? t("panel.loadFailed") : t("panel.loading")}</p>;
}

function DomainList({ loaded, company, domains, onSelect }: { loaded: LoadedData; company: CompanyNode; domains: Domain[]; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");
  const shown = domains.filter((d) => d.name.includes(filter.toLowerCase()));
  return (
    <>
      <input className="filter" type="search" placeholder={t("panel.filterDomains")} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul className="domains">
        {shown.map((domain, index) => (
          <li key={`${domain.name}-${index}`} className={domain.parent ? "child" : undefined}>
            <div className="domain-line">
              <GamblingDomain domain={domain.name} />
              <span className={`status status-${domain.status}`}>{term(t, domain.status)}</span>
              {domain.verified && <span className="tag">{t("domain.verified")}</span>}
            </div>
            <div className="muted small">
              {[domain.added && t("domain.added", { date: domain.added }), domain.since && t("domain.since", { status: term(t, domain.status), date: domain.since })]
                .filter(Boolean)
                .join(" · ")}
              {company.url && (
                <>
                  {" · "}
                  <a href={`${company.url}?tab=domains&domain=${encodeURIComponent(domain.raw ?? domain.name)}`} target="_blank" rel="noopener noreferrer">
                    {t("domain.source")} ↗
                  </a>
                </>
              )}
            </div>
            {domain.history && (
              <div className="muted small">
                {t("domain.history")}{" "}
                {domain.history.map((h) => [term(t, h.status), h.since ?? h.added].filter(Boolean).join(" ")).join(" · ")}
              </div>
            )}
            {domain.registrations.length > 0 && (
              <div className="small">
                {t("panel.alsoRecorded")}{" "}
                {domain.registrations.map((reg, i) => {
                  const targetId =
                    reg.companyId !== undefined
                      ? `c:${reg.companyId}`
                      : loaded.foreignIndex.get(foreignKey(reg.jurisdiction, reg.holder));
                  const target = targetId ? loaded.nodes.get(targetId) : undefined;
                  const otherUrl =
                    reg.companyId === undefined
                      ? `${loaded.meta.source}/other-jurisdictions?company=${encodeURIComponent(reg.holder)}&domain=${encodeURIComponent(domain.raw ?? domain.name)}`
                      : null;
                  return (
                    <span key={i}>
                      {i > 0 && ", "}
                      {target ? (
                        <button type="button" className="inline-link" onClick={() => onSelect(target.id)}>
                          {target.label}
                        </button>
                      ) : (
                        reg.holder
                      )}{" "}
                      <span className="muted">({reg.jurisdiction})</span>
                      {otherUrl && (
                        <>
                          {" "}
                          <a href={otherUrl} target="_blank" rel="noopener noreferrer" className="small">
                            ↗
                          </a>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function ApplicationView({ app }: { app: Application }) {
  const { t } = useI18n();
  return (
    <div className="application">
      <h4>
        {app.license || t("apl.application")} {app.status && <span className="tag">{app.status}</span>}
      </h4>
      <Facts
        rows={[
          [t("apl.submitted"), app.submitted],
          [t("apl.endDate"), app.endDate],
          ...Object.entries(app.customer).map(([k, v]) => [t("apl.customer", { field: k }), v] as [string, ReactNode]),
        ]}
      />
      {app.timeline.length > 0 && (
        <ol className="timeline">
          {app.timeline.map((step, i) => (
            <li key={i}>
              <strong>{step.stage}</strong> <span className="muted">{step.date}</span>
              {step.reviewer && (
                <div className="small">
                  {step.reviewer}
                  {step.alias && <span className="muted"> ({step.alias})</span>}
                  {step.info.length > 0 && <div className="muted">{step.info.join(" · ")}</div>}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {app.checklists.map((list, i) => (
        <details key={i} className="checklist">
          <summary>
            {list.name} {list.criticality && <span className="tag">{list.criticality}</span>} <span className="muted">{t("apl.items", { n: list.items.length })}</span>
          </summary>
          <ul>
            {list.items.map((item, j) => (
              <li key={j}>
                <strong>{item.title}</strong> {item.criticality && <span className="tag">{item.criticality}</span>}
                {item.due && <span className="muted small"> {t("apl.due", { date: item.due })}</span>}
                {item.description && <p className="small">{item.description}</p>}
                {item.notes && <p className="small muted pre">{item.notes}</p>}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

function DocumentList({ loaded, docs, archive }: { loaded: LoadedData; docs: DocumentLink[]; archive?: string | null }) {
  const { t } = useI18n();
  const byFolder = new Map<string, DocumentLink[]>();
  for (const doc of docs) {
    const list = byFolder.get(doc.folder) ?? [];
    list.push(doc);
    byFolder.set(doc.folder, list);
  }
  return (
    <>
      <p className="muted small">{t("panel.documentsNote")}</p>
      {docs.length >= 100 && <p className="muted small">{t("panel.docsCap")}</p>}
      {archive && (
        <SourceLinks loaded={loaded} url={archive} label={t("panel.downloadAll")} />
      )}
      {[...byFolder.entries()].map(([folder, list]) => (
        <details key={folder} className="folder">
          <summary>
            {folder || t("panel.documents")} <span className="count">{list.length}</span>
          </summary>
          <ul className="docs">
            {list.map((doc, i) => (
              <li key={i}>
                <span className="doc-name">{doc.name}</span>
                <span className="muted small">{doc.size}</span>
                {doc.url && (
                  <span className="doc-actions">
                    {doc.preview && (
                      <a href={doc.url.replace("&download=1", "")} target="_blank" rel="noopener noreferrer">
                        {t("panel.open")}
                      </a>
                    )}
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {t("panel.download")}
                    </a>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

// ----------------------------------------------------------------- others

function PersonDetails({ loaded, node, onSelect }: { loaded: LoadedData; node: PersonNode; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const namesakes = (node.namesakes ?? []).map((id) => loaded.nodes.get(id)).filter((n): n is DataNode => !!n);
  const network = personNetwork(loaded, node);
  return (
    <>
      <Facts
        rows={[
          [t("panel.birthMonth"), node.birthMonths?.length ? node.birthMonths.join(" / ") : node.birthMonth],
          [t("panel.passports"), <CountryList countries={node.passports} />],
          [t("panel.residence"), node.residences.length ? <CountryList countries={node.residences} /> : undefined],
          [
            t("panel.nameSuggests"),
            node.nameCountries?.length ? (
              <>
                <CountryList countries={node.nameCountries} /> <span className="muted">({t("panel.guess")})</span>
              </>
            ) : undefined,
          ],
          [t("panel.companies"), network.companies.length],
          [t("panel.domains"), network.domains ? `${network.domains} (${network.activeDomains} ${t("panel.active")})` : undefined],
          [t("panel.linkedPeople"), network.linked.length || undefined],
        ]}
      />
      <p className="muted small">
        {t("panel.personNote")}
        {node.mergedReason && ` ${t("panel.mergedNote")}`}
      </p>
      <NodeMentions loaded={loaded} id={node.id} onSelect={onSelect} />
      <Section title={t("panel.companies")} count={network.companies.length}>
        <ul className="links">
          {network.companies.map(({ id, records, summary }) => {
            const company = loaded.nodes.get(id);
            return (
              <li key={id} className="record">
                {company && (
                  <NodeButton node={company} onSelect={onSelect}>
                    {companyLine(summary, t)}
                  </NodeButton>
                )}
                <div className="badges">
                  {records.map((record, i) => (
                    <span key={i} className="badge" title={[record.role, term(t, record.group), span(t, record.from, record.until)].filter(Boolean).join(" · ")}>
                      {term(t, record.role ?? record.group)}
                      {(record.from || record.until) && <span className="badge-dates">{span(t, record.from, record.until)}</span>}
                    </span>
                  ))}
                </div>
                <Facts rows={mergedDetails(records, t)} />
                <PeopleBadges loaded={loaded} ids={summary.people.filter((id) => id !== node.id)} onSelect={onSelect} />
                {company?.type === "company" && <SourceLinks loaded={loaded} url={company.url ? `${company.url}?tab=people` : null} />}
              </li>
            );
          })}
        </ul>
      </Section>
      {network.linked.length > 0 && (
        <Section title={t("panel.sameCompanies")} count={network.linked.length} open={network.linked.length <= 20}>
          <ul className="links">
            {network.linked
              .map((id) => loaded.nodes.get(id))
              .filter((n): n is DataNode => !!n)
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((other) => (
                <li key={other.id}>
                  <NodeButton node={other} onSelect={onSelect}>
                    {describe(other, t)}
                  </NodeButton>
                </li>
              ))}
          </ul>
        </Section>
      )}
      <PersonDomains loaded={loaded} companies={network.companies.map((c) => c.id)} onSelect={onSelect} />
      {namesakes.length > 0 && (
        <Section title={t("panel.namesakes")} count={namesakes.length}>
          <ul className="links">
            {namesakes.map((other) => (
              <li key={other.id}>
                <NodeButton node={other} onSelect={onSelect}>
                  {describe(other, t)}
                </NodeButton>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function CountryList({ countries }: { countries: string[] }) {
  return (
    <>
      {countries.map((c, i) => (
        <span key={c} className="country-item">
          {i > 0 && ", "}
          <Flag country={c} /> {c}
        </span>
      ))}
    </>
  );
}

/** Domains of all the person's companies, grouped by company. */
function PersonDomains({ loaded, companies, onSelect }: { loaded: LoadedData; companies: string[]; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const groups = companies
    .map((id) => loaded.nodes.get(id))
    .filter((n): n is CompanyNode => n?.type === "company" && (n.domains?.length ?? 0) > 0);
  const total = groups.reduce((sum, c) => sum + (c.domains?.length ?? 0), 0);
  if (!total) return null;
  return (
    <Section title={t("panel.companyDomains")} count={total} open={total <= 40}>
      {groups.map((company) => (
        <details key={company.id} className="folder" open={groups.length === 1 || (company.domains?.length ?? 0) <= 15}>
          <summary>
            <button type="button" className="inline-link" onClick={() => onSelect(company.id)}>
              {company.label}
            </button>
            <span className="count">{company.domains!.length}</span>
          </summary>
          <DomainList loaded={loaded} company={company} domains={company.domains!} onSelect={onSelect} />
        </details>
      ))}
    </Section>
  );
}

/** Other people of a company as small clickable badges. */
function PeopleBadges({ loaded, ids, onSelect }: { loaded: LoadedData; ids: string[]; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const people = ids
    .map((id) => loaded.nodes.get(id))
    .filter((n): n is DataNode => !!n)
    .sort((a, b) => a.label.localeCompare(b.label));
  if (!people.length) return null;
  return (
    <div className="people-badges">
      <span className="muted small">{t("panel.with")}</span>
      {people.map((person) => (
        <button key={person.id} type="button" className="person-badge" title={describe(person, t)} onClick={() => onSelect(person.id)}>
          <span className="dot" style={{ background: nodeColor(person) }} />
          {person.type === "person" && person.passports[0] && <Flag country={person.passports[0]} />}
          {person.label}
        </button>
      ))}
    </div>
  );
}

function companyLine(summary: CompanySummary, t: Translate) {
  const parts = [];
  if (summary.domains) parts.push(t("count.domains", { n: summary.domains }));
  else if (summary.activeDomains) parts.push(t("count.activeDomains", { n: summary.activeDomains }));
  if (summary.people.length) parts.push(t("nat.people", { n: summary.people.length }));
  return parts.join(" · ");
}

/** Details of all filings in one company, each distinct value once. */
function mergedDetails(records: PersonRecord[], t: Translate): [string, ReactNode][] {
  const rows = new Map<string, Set<string>>();
  const add = (key: string, value: string) => {
    if (!value) return;
    const set = rows.get(key) ?? new Set<string>();
    set.add(value);
    rows.set(key, set);
  };
  for (const record of records) {
    for (const [key, value] of Object.entries(record.details)) {
      if (key !== "birthMonth") add(DETAIL_LABELS[key] ? t(DETAIL_LABELS[key]) : key, value);
    }
    for (const a of record.addresses) add(a.type ?? t("detail.address"), `${a.text}${a.status ? ` (${a.status})` : ""}`);
  }
  return [...rows.entries()].map(([key, values]) => [key, [...values].join("; ")]);
}

const DETAIL_LABELS: Record<string, Key> = {
  passportCountry: "edge.passport",
  position: "detail.position",
};

function OrganizationDetails({ node, links, onSelect }: { node: OrganizationNode; links: Link[]; onSelect: (id: string) => void }) {
  return (
    <>
      <Facts rows={Object.entries(node.details ?? {}).map(([k, v]) => [k, v] as [string, ReactNode])} />
      <LinkGroups links={links} onSelect={onSelect} />
    </>
  );
}

function ForeignDetails({
  loaded,
  node,
  links,
  onSelect,
}: {
  loaded: LoadedData;
  node: ForeignNode;
  links: Link[];
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Facts rows={[[t("panel.jurisdiction"), node.jurisdiction]]} />
      {node.register && (
        <p className="source-links">
          <a href={node.register} target="_blank" rel="noopener noreferrer">
            {node.jurisdiction} {t("panel.register")} ↗
          </a>
        </p>
      )}
      <NodeMentions loaded={loaded} id={node.id} onSelect={onSelect} />
      <LinkGroups links={links} onSelect={onSelect} />
      <Section title={t("panel.licensedDomains")} count={node.licences.length} open={node.licences.length <= 20}>
        <ul className="domains">
          {node.licences.map((lic, index) => (
            <li key={`${lic.domain}-${index}`}>
              <GamblingDomain domain={lic.domain} />
              <div className="muted small">
                {[lic.licence, lic.detail, lic.issued && t("lic.issued", { date: lic.issued }), lic.expires && t("lic.expires", { date: lic.expires })]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function CountryDetails({ links, onSelect }: { node: CountryNode; links: Link[]; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  return <LinkGroups links={links} onSelect={onSelect} detail={({ other }) => (other.type === "person" ? <PersonLine person={other} t={t} /> : null)} />;
}

/** One line about a person in a country list: passports, residences, roles and number of companies. */
function PersonLine({ person, t }: { person: PersonNode; t: Translate }) {
  const roles = [...new Set(person.records.map((r) => r.role).filter(Boolean))].map((role) => term(t, role));
  const companies = new Set(person.records.map((r) => r.company)).size;
  const parts: ReactNode[] = [];
  if (person.passports.length) parts.push(<CountryList key="p" countries={person.passports} />);
  if (person.residences.length) {
    parts.push(
      <span key="r">
        {t("panel.residence")}: <CountryList countries={person.residences} />
      </span>,
    );
  }
  if (roles.length) parts.push(<span key="o">{roles.join(", ")}</span>);
  if (companies) parts.push(<span key="c">{t("map.companies", { n: companies })}</span>);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {part}
        </span>
      ))}
    </>
  );
}

function DomainDetails({ loaded, name, onSelect }: { loaded: LoadedData; name: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const owners = (loaded.domainIndex.get(name.toLowerCase()) ?? []).map((id) => loaded.nodes.get(id)).filter((n): n is DataNode => !!n);
  return (
    <>
      <p className="source-links">
        <GamblingDomain domain={name} />
      </p>
      <Section title={t("panel.recordedFor")} count={owners.length}>
        <ul className="links">
          {owners.map((owner) => (
            <li key={owner.id}>
              <NodeButton node={owner} onSelect={onSelect}>
                {describe(owner, t)}
              </NodeButton>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

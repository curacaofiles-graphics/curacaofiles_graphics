import { TYPE_COLORS, describe, nodeColor, personNetwork, type LoadedData, type NationalityFocus } from "../data";
import { Flag, countryLabel } from "../flags";
import { useI18n } from "../i18n";
import { term } from "../terms";
import type { PersonNode } from "../types";

interface Props {
  loaded: LoadedData;
  focus: NationalityFocus;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** People holding the chosen passport countries, with the companies they are linked to. */
export function NationalityPanel({ loaded, focus, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const { countries } = focus;
  const title = countries.length <= 3 ? countries.map(countryLabel).join(", ") : t("nat.countries", { n: countries.length });

  return (
    <aside className="panel" aria-label={t("picker.nationality")}>
      <header className="panel-head">
        <span className="dot big" style={{ background: TYPE_COLORS.country }} />
        <div>
          <h2>
            {countries.length <= 3 && countries.map((c) => <Flag key={c} country={c} className="flag-title" />)} {title}
          </h2>
          <p className="muted">
            {t("nat.people", { n: focus.people.length })} · {t("nat.companies", { n: focus.companies })}
          </p>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label={t("picker.clear")}>
          ×
        </button>
      </header>
      <div className="panel-body">
        <p className="muted small">
          {t("nat.note")}
        </p>

        {countries.length > 1 && (
          <details className="section" open>
            <summary>
              {t("nat.linking")}<span className="count">{focus.shared.length}</span>
            </summary>
            <div className="section-body">
              {focus.shared.length === 0 && <p className="muted small">{t("nat.noLinking")}</p>}
              <ul className="links">
                {focus.shared.map(({ company, countries: linked }) => {
                  const node = loaded.nodes.get(company);
                  if (!node) return null;
                  return (
                    <li key={company}>
                      <button type="button" className="node-link" onClick={() => onSelect(company)}>
                        <span className="dot" style={{ background: nodeColor(node) }} />
                        <span className="node-link-text">
                          <span>{node.label}</span>
                          <span className="muted small">{linked.join(" · ")}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        )}

        {countries.map((country) => {
          const people = (focus.byCountry.get(country) ?? [])
            .map((id) => loaded.nodes.get(id))
            .filter((n): n is PersonNode => n?.type === "person");
          return (
            <details key={country} className="section" open={countries.length === 1 || people.length <= 25}>
              <summary>
                {focus.colors.has(country) && <span className="dot legend" style={{ background: focus.colors.get(country) }} />}
                <Flag country={country} /> {countryLabel(country)}
                <span className="count">{people.length}</span>
              </summary>
              <ul className="links section-body">
                {people.map((person) => (
                  <PersonRow
                    key={person.id}
                    loaded={loaded}
                    person={person}
                    color={focus.personColors.get(person.id)}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </aside>
  );
}

function PersonRow({
  loaded,
  person,
  color,
  onSelect,
}: {
  loaded: LoadedData;
  person: PersonNode;
  color?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const network = personNetwork(loaded, person);
  const roles = [...new Set(person.records.map((r) => r.role).filter(Boolean))].map((role) => term(t, role)).join(", ");
  const totals = [
    network.domains ? t("nat.domainsActive", { n: network.domains, active: network.activeDomains }) : "",
    network.linked.length ? t("nat.linked", { n: network.linked.length }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="record">
      <button type="button" className="node-link" onClick={() => onSelect(person.id)}>
        <span className="dot" style={{ background: color ?? TYPE_COLORS.person }} />
        <span className="node-link-text">
          <span>{person.label}</span>
          <span className="muted small">
            {person.passports.map((c, i) => (
              <span key={c}>
                {i > 0 && " / "}
                <Flag country={c} /> {c}
              </span>
            ))}
            {person.nameCountries?.length ? (
              <span>
                {" · "}
                {t("panel.nameSuggests")}:{" "}
                {person.nameCountries.map((c, i) => (
                  <span key={c}>
                    {i > 0 && ", "}
                    <Flag country={c} /> {c}
                  </span>
                ))}
                ?
              </span>
            ) : null}
            {[person.birthMonth, roles].filter(Boolean).map((part) => ` · ${part}`)}
          </span>
        </span>
      </button>
      <div className="company-chips">
        {network.companies.map(({ id, summary }) => {
          const company = loaded.nodes.get(id);
          if (!company) return null;
          return (
            <button key={id} type="button" className="inline-link small" onClick={() => onSelect(id)}>
              {company.label}
              {summary.domains > 0 && <span className="muted"> ({summary.domains})</span>}
            </button>
          );
        })}
      </div>
      {totals && <div className="muted small person-totals">{totals}</div>}
      {network.linked.length > 0 && (
        <div className="linked-people">
          <div className="people-badges linked-badges">
            {network.linked
              .map((id) => loaded.nodes.get(id))
              .filter((n) => n !== undefined)
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((other) => (
                <button
                  key={other.id}
                  type="button"
                  className="person-badge"
                  title={describe(other, t)}
                  onClick={() => onSelect(other.id)}
                >
                  <span className="dot" style={{ background: nodeColor(other) }} />
                  {other.type === "person" && other.passports[0] && <Flag country={other.passports[0]} />}
                  {other.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </li>
  );
}

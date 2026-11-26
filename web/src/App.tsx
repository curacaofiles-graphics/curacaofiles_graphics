import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { GraphView } from "./components/GraphView";
import { Legend, type LegendItem } from "./components/Legend";
import { useGatedLink } from "./components/LinkGate";
import { SearchBox } from "./components/SearchBox";
import { MentionsPanel } from "./components/Mentions";
import { NationalityPanel } from "./components/NationalityPanel";
import { NationalityPicker } from "./components/NationalityPicker";
import { SidePanel } from "./components/SidePanel";
import {
  COMPANY_COLORS,
  DEFAULT_VISIBLE,
  TYPE_COLORS,
  collapseDomains,
  expandDomains,
  loadData,
  mentionFocus,
  nationalities,
  nationalityFocus,
  type CountryMatch,
  type LoadedData,
} from "./data";
import { LanguagePicker, useI18n, type Translate } from "./i18n";
import { PRESS, type PressItem } from "./press";
import { term } from "./terms";
import type { CompanyNode, NodeType } from "./types";

const DATA_URL = `${import.meta.env.BASE_URL}data/graph.json`;
const FILTER_TYPES: NodeType[] = ["company", "person", "organization", "foreign", "country", "domain"];

// The map view (and its world outline) is only loaded when someone opens it.
const MapView = lazy(() => import("./components/MapView").then((m) => ({ default: m.MapView })));

type View = "graph" | "map";

function readView(): View {
  return new URLSearchParams(window.location.search).get("view") === "map" ? "map" : "graph";
}

function graphLegend(t: Translate, visible: Set<NodeType>, mentions: boolean): LegendItem[] {
  const items: LegendItem[] = [];
  if (visible.has("company")) {
    for (const [listType, color] of Object.entries(COMPANY_COLORS)) {
      items.push({ shape: "circle", color, label: `${t("node.company")}: ${term(t, listType)}` });
    }
  }
  for (const type of ["person", "organization", "foreign", "country", "domain"] as NodeType[]) {
    if (visible.has(type)) items.push({ shape: "circle", color: TYPE_COLORS[type], label: t(`type.${type}`) });
  }
  if (mentions) items.push({ shape: "star", color: "#facc15", label: t("mentions.inMedia") });
  return items;
}

/** Articles or videos about the investigation; video links open through the regional-block notice. */
function PressList({ kind, title }: { kind: PressItem["kind"]; title: string }) {
  const gated = useGatedLink();
  const items = PRESS.filter((item) => item.kind === kind);
  if (!items.length) return null;
  return (
    <>
      <h4 className="press-kind">{title}</h4>
      <ul className="press">
        {items.map((item) => (
          <li key={item.url}>
            {kind === "video" ? (
              <a {...gated(item.url, "video")}>▶ {item.title}</a>
            ) : (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            )}
            <span className="muted small">
              {" "}
              · {item.outlet}
              {item.date && ` · ${item.date}`} · {item.language.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function readCountries(): string[] {
  return new URLSearchParams(window.location.search).getAll("country");
}

function readHash(): string | null {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return id || null;
}

export function App() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(readHash);
  const [visible, setVisible] = useState(() => new Set<NodeType>(DEFAULT_VISIBLE));
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set<string>());
  const [version, setVersion] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [view, setView] = useState<View>(readView);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(readCountries);
  const [mentionsOn, setMentionsOn] = useState(() => new URLSearchParams(window.location.search).has("mentions"));
  const [countryMatch, setCountryMatch] = useState<CountryMatch>(() => {
    const params = new URLSearchParams(window.location.search);
    // Both are on by default; the URL only records when one is switched off (?residence=0, ?names=0).
    return { residence: params.get("residence") !== "0", names: params.get("names") !== "0" };
  });

  useEffect(() => {
    loadData(DATA_URL).then(
      (data) => {
        setLoaded(data);
        // Without precomputed positions, lay the graph out in the browser.
        setLayoutRunning(!data.meta.layout);
      },
      (e: unknown) => setError(String(e)),
    );
  }, []);

  // Selection lives in the URL hash, so a view can be shared or bookmarked.
  useEffect(() => {
    const onHash = () => setSelected(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelected(id);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", id ? `#${encodeURIComponent(id)}` : pathname + search);
  }, []);

  const toggleDomains = useCallback(
    (company: CompanyNode) => {
      if (!loaded) return;
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(company.id)) {
          collapseDomains(loaded, company);
          next.delete(company.id);
        } else {
          expandDomains(loaded, company);
          next.add(company.id);
        }
        return next;
      });
      setVersion((v) => v + 1);
    },
    [loaded],
  );

  // Nationality filter lives in the query string as a repeated key, one per country
  // (?country=Cyprus&country=Malta&country=Ukraine); URLSearchParams.getAll reads it back as a list.
  const chooseCountries = useCallback((values: string[]) => {
    setSelectedCountries(values);
    const url = new URL(window.location.href);
    url.searchParams.delete("country");
    values.forEach((value) => url.searchParams.append("country", value));
    if (values.length) {
      setMentionsOn(false);
      url.searchParams.delete("mentions");
    }
    window.history.replaceState(null, "", url);
  }, []);

  // The Mentions filter and the country filter replace each other.
  const toggleMentions = useCallback((on: boolean) => {
    setMentionsOn(on);
    const url = new URL(window.location.href);
    if (on) {
      url.searchParams.set("mentions", "1");
      url.searchParams.delete("country");
      setSelectedCountries([]);
    } else {
      url.searchParams.delete("mentions");
    }
    window.history.replaceState(null, "", url);
  }, []);

  const changeCountryMatch = useCallback((next: CountryMatch) => {
    setCountryMatch(next);
    const url = new URL(window.location.href);
    for (const key of ["residence", "names"] as const) {
      if (next[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, "0");
    }
    window.history.replaceState(null, "", url);
  }, []);

  const countries = useMemo(() => (loaded ? nationalities(loaded, countryMatch) : []), [loaded, countryMatch]);
  const focus = useMemo(
    () => (loaded && selectedCountries.length ? nationalityFocus(loaded, selectedCountries, countryMatch) : null),
    // version: expanded domains change the neighbourhood.
    [loaded, selectedCountries, countryMatch, version],
  );
  const mentionNodes = useMemo(
    () => (loaded && mentionsOn ? mentionFocus(loaded) : null),
    // version: expanded domains change the neighbourhood.
    [loaded, mentionsOn, version],
  );

  const changeView = useCallback((next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "map") url.searchParams.set("view", "map");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }, []);

  const layoutDone = useCallback(() => setLayoutRunning(false), []);
  const node = loaded && selected ? loaded.nodes.get(selected) ?? null : null;
  const counts = useMemo(() => {
    const out: Partial<Record<NodeType, number>> = {};
    loaded?.nodes.forEach((n) => (out[n.type] = (out[n.type] ?? 0) + 1));
    // Domain nodes only exist once expanded; the chip shows how many domains the data has.
    if (loaded) out.domain = loaded.domainIndex.size;
    return out;
  }, [loaded, version]);

  if (error) {
    return (
      <main className="message">
        <h1>{t("app.loadError")}</h1>
        <p>{error}</p>
        <p className="muted">
          {t("app.generateFirst")} <code>python -m curacao_scraper</code> (README)
        </p>
      </main>
    );
  }
  if (!loaded) {
    return <main className="message">{t("app.loading")}</main>;
  }

  const { meta } = loaded;
  return (
    <div className={`app${node || focus || mentionNodes ? " with-panel" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <strong>#CasinoSecrets</strong> <span className="muted">{t("app.graph")}</span>
        </div>
        <SearchBox loaded={loaded} onSelect={select} />
        <NationalityPicker
          options={countries}
          selected={selectedCountries}
          onChange={chooseCountries}
          match={countryMatch}
          onMatchChange={changeCountryMatch}
        />
        <div className="view-switch" role="group" aria-label={t("view.label")}>
          {(["graph", "map"] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              className={view === option ? "on" : undefined}
              aria-pressed={view === option}
              onClick={() => changeView(option)}
            >
              {t(option === "graph" ? "view.graph" : "view.map")}
            </button>
          ))}
        </div>
        <div className="filters" role="group" aria-label={t("types.label")} hidden={view === "map"}>
          {FILTER_TYPES.filter((type) => (counts[type] ?? 0) > 0).map((type) => (
            <label key={type} className={visible.has(type) ? "chip on" : "chip"}>
              <input
                type="checkbox"
                checked={visible.has(type)}
                onChange={() =>
                  setVisible((current) => {
                    const next = new Set(current);
                    if (next.has(type)) next.delete(type);
                    else next.add(type);
                    return next;
                  })
                }
              />
              <span className="dot" style={{ background: TYPE_COLORS[type] }} />
              {t(`type.${type}`)} <span className="muted">{counts[type] ?? 0}</span>
            </label>
          ))}
        </div>
        <div className="actions">
          {loaded.highlights.mentions.length > 0 && (
            <button
              type="button"
              className={mentionsOn ? "toggle on" : "toggle"}
              aria-pressed={mentionsOn}
              onClick={() => toggleMentions(!mentionsOn)}
            >
              ★ {t("action.mentions")} <span className="muted">{loaded.mentionsByNode.size}</span>
            </button>
          )}
          <button type="button" onClick={() => setAboutOpen((o) => !o)}>
            {t("action.about")}
          </button>
          <LanguagePicker />
        </div>
      </header>

      <div className="stage">
        {view === "graph" ? (
          <>
            <GraphView
              loaded={loaded}
              visible={visible}
              selected={selected}
              focus={mentionNodes ?? focus?.nodes ?? null}
              colors={focus?.personColors.size ? focus.personColors : null}
              onSelect={select}
              layoutRunning={layoutRunning}
              onLayoutDone={layoutDone}
              version={version}
            />
            <Legend items={graphLegend(t, visible, loaded.mentionsByNode.size > 0)} />
          </>
        ) : (
          <Suspense fallback={<p className="map-loading muted">{t("panel.loading")}</p>}>
            <MapView loaded={loaded} selected={selected} focus={mentionNodes ?? focus?.nodes ?? null} onSelect={select} />
          </Suspense>
        )}
      </div>

      {!node && mentionNodes && (
        <MentionsPanel loaded={loaded} onSelect={select} onClose={() => toggleMentions(false)} />
      )}

      {!node && !mentionNodes && focus && (
        <NationalityPanel loaded={loaded} focus={focus} onSelect={select} onClose={() => chooseCountries([])} />
      )}

      {node && (
        <SidePanel
          loaded={loaded}
          node={node}
          onSelect={select}
          onClose={() => select(null)}
          expanded={expanded.has(node.id)}
          onToggleDomains={toggleDomains}
        />
      )}

      <footer className="source-note">
        {t("footer.data")}:{" "}
        <a href={meta.source} target="_blank" rel="noopener noreferrer">
          {meta.source.replace("https://", "")}
        </a>
        {meta.mirror && (
          <>
            {" / "}
            <a href={meta.mirror} target="_blank" rel="noopener noreferrer">
              {meta.mirror.replace("https://", "")}
            </a>
          </>
        )}{" "}
        · {meta.title} {t("footer.by")}{" "}
        <a href={meta.investigation} target="_blank" rel="noopener noreferrer">
          {meta.publisher}
        </a>{" "}
        · {t("footer.snapshot")} {meta.generated.slice(0, 10)} ·{" "}
        <button type="button" className="inline-link" onClick={() => setAboutOpen(true)}>
          {t("footer.readBefore")}
        </button>
      </footer>

      {aboutOpen && (
        <div className="about" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={() => setAboutOpen(false)}>
          <div className="about-card" onClick={(e) => e.stopPropagation()}>
            <h2 id="about-title">{t("about.title")}</h2>
            <p>{t("about.disclaimer")}</p>
            <details className="original">
              <summary className="muted small">{t("about.showOriginal")}</summary>
              <p className="small">{meta.disclaimer}</p>
            </details>
            <p>
              {t("about.links")}{" "}
              <a href={meta.source} target="_blank" rel="noopener noreferrer">
                {meta.source.replace("https://", "")}
              </a>
            </p>
            <p>
              {t("about.registers")}{" "}
              {Object.entries(meta.registers).map(([name, url], i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {name}
                  </a>
                </span>
              ))}
            </p>
            <p className="muted small">{t("about.people")}</p>
            <p className="muted small">{t("about.videos")}</p>
            <h3 className="about-subtitle">{t("about.press")}</h3>
            <p className="muted small">{t("about.pressNote")}</p>
            <PressList kind="article" title={t("press.articles")} />
            <PressList kind="video" title={t("press.videos")} />
            <button type="button" onClick={() => setAboutOpen(false)}>
              {t("action.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

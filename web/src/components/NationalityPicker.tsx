import { useEffect, useRef, useState } from "react";

import type { CountryMatch, Nationality } from "../data";
import { Flag, countryLabel, countrySearchText } from "../flags";
import { useI18n } from "../i18n";

interface Props {
  options: Nationality[];
  selected: string[];
  onChange: (countries: string[]) => void;
  match: CountryMatch;
  onMatchChange: (match: CountryMatch) => void;
}

/** Multi-select of passport countries, most common first, with people counts. */
export function NationalityPicker({ options, selected, onChange, match, onMatchChange }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const chosen = new Set(selected);
  const total = options.reduce((sum, o) => sum + o.count, 0);
  const label = match.residence || match.names ? t("picker.country") : t("picker.nationality");
  const counts = new Map(options.map((o) => [o.name, o.count]));
  const query = filter.trim().toLowerCase();
  const shown = options.filter((o) => !query || countrySearchText(o.name, lang.code).includes(query));
  const toggle = (name: string) =>
    onChange(chosen.has(name) ? selected.filter((c) => c !== name) : [...selected, name]);

  let summary = t("picker.all", { n: total });
  if (selected.length === 1) summary = `${countryLabel(selected[0])} (${counts.get(selected[0]) ?? 0})`;
  else if (selected.length > 1) {
    const people = selected.reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);
    summary = t("picker.countries", { n: selected.length, people });
  }

  return (
    <div className="nationality" ref={root}>
      <span className="muted">{label}</span>
      <div className={`picker-control${open ? " open" : ""}${selected.length ? " active" : ""}`}>
        <button
          type="button"
          className="picker-main"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {selected.length === 1 && <Flag country={selected[0]} />}
          <span className="picker-summary">{summary}</span>
          <span className="picker-caret" aria-hidden="true">
            ▾
          </span>
        </button>
        {selected.length > 0 && (
          <button type="button" className="picker-clear" onClick={() => onChange([])} aria-label={t("picker.clear")} title={t("picker.clear")}>
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="picker" role="listbox" aria-multiselectable="true">
          <input
            type="search"
            className="filter"
            placeholder={t("picker.filter")}
            value={filter}
            autoFocus
            onChange={(event) => setFilter(event.target.value)}
          />
          <label className="picker-option">
            <input
              type="checkbox"
              checked={match.residence}
              onChange={(event) => onMatchChange({ ...match, residence: event.target.checked })}
            />
            <span>{t("picker.residence")}</span>
          </label>
          <label className="picker-option">
            <input
              type="checkbox"
              checked={match.names}
              onChange={(event) => onMatchChange({ ...match, names: event.target.checked })}
            />
            <span>{t("picker.names")}</span>
          </label>
          <p className="muted small picker-note">
            {t("picker.note")}
          </p>
          {selected.length > 0 && (
            <div className="picker-chosen">
              {selected.map((name) => (
                <button key={name} type="button" className="chip on" onClick={() => toggle(name)}>
                  <Flag country={name} /> {countryLabel(name)} ×
                </button>
              ))}
            </div>
          )}
          <ul>
            {shown.map((option) => (
              <li key={option.name}>
                <label>
                  <input type="checkbox" checked={chosen.has(option.name)} onChange={() => toggle(option.name)} />
                  <Flag country={option.name} />
                  <span className="picker-name">{countryLabel(option.name)}</span>
                  <span className="muted">{option.count}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="muted small">{t("picker.noMatch")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

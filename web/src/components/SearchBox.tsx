import { useMemo, useState } from "react";

import { TYPE_COLORS, search, type LoadedData } from "../data";
import { useI18n } from "../i18n";

interface Props {
  loaded: LoadedData;
  onSelect: (id: string) => void;
}

export function SearchBox({ loaded, onSelect }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => search(loaded, query, t), [loaded, query, t]);

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className="search">
      <input
        type="search"
        value={query}
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && hits[0]) choose(hits[0].id);
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul className="search-results" role="listbox">
          {hits.map((hit) => (
            <li key={hit.id + hit.hint}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(hit.id)}>
                <span className="dot" style={{ background: TYPE_COLORS[hit.type] }} />
                <span className="search-label">{hit.label}</span>
                <span className="search-hint">{hit.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

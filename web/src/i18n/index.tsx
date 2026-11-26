import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { LANGUAGES, en, type Key, type Language } from "../locales";

export { LANGUAGES, type Key, type Language };

const STORAGE_KEY = "lang";

function initialLanguage(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (fromUrl && LANGUAGES.some((l) => l.code === fromUrl)) return fromUrl;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    // storage can be unavailable (private mode); fall back to English
  }
  return "en";
}

export type Translate = (key: Key, vars?: Record<string, string | number>) => string;

interface I18n {
  lang: Language;
  setLang: (code: string) => void;
  t: Translate;
}

const Context = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(initialLanguage);
  const lang = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES.find((l) => l.code === "en")!;

  useEffect(() => {
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir ?? "ltr";
  }, [lang]);

  const setLang = useCallback((next: string) => {
    setCode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      let text = lang.dict[key] ?? en[key];
      if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
      return text;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error("useI18n outside I18nProvider");
  return value;
}

function label(l: Language): string {
  return l.native === l.english ? l.english : `${l.native} (${l.english})`;
}

/** Language picker with SVG flags: own name first, English name in brackets, alphabetical by English name. */
export function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
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

  return (
    <div className="language" ref={root}>
      <button
        type="button"
        className="picker-button language-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("app.language")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`fi fi-${lang.flag} flag`} aria-hidden="true" /> {label(lang)} <span className="muted">▾</span>
      </button>
      {open && (
        <ul className="picker language-list" role="listbox" aria-label={t("app.language")}>
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang.code}
                className={l.code === lang.code ? "language-option on" : "language-option"}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                <span className={`fi fi-${l.flag} flag`} aria-hidden="true" />
                <span lang={l.code} dir={l.dir ?? "ltr"}>
                  {label(l)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

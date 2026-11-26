import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { useI18n } from "../i18n";

/**
 * Some links get a short notice before they open:
 * - "video": third-party videos may be blocked in some countries (another network / VPN may help);
 * - "gambling": betting / casino sites from the register get a disclaimer and a short wait, every time.
 */
export type GateKind = "video" | "gambling";

const GAMBLING_WAIT_SECONDS = 5;

type Open = (url: string, kind: GateKind) => void;

const Context = createContext<Open | null>(null);

export function LinkGateProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [pending, setPending] = useState<{ url: string; kind: GateKind } | null>(null);
  const [wait, setWait] = useState(0);

  const open = useCallback<Open>((url, kind) => {
    setPending({ url, kind });
    setWait(kind === "gambling" ? GAMBLING_WAIT_SECONDS : 0);
  }, []);
  const close = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (!pending) return;
    const escape = (event: globalThis.KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [pending, close]);

  // Count down before the gambling link can be followed.
  useEffect(() => {
    if (!pending || wait <= 0) return;
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pending, wait]);

  const go = () => {
    if (!pending || wait > 0) return;
    window.open(pending.url, "_blank", "noopener,noreferrer");
    close();
  };

  const video = pending?.kind === "video";
  const label = video ? t("video.continue") : t("gamble.continue");
  return (
    <Context.Provider value={open}>
      {children}
      {pending && (
        <div className="about" role="dialog" aria-modal="true" aria-labelledby="gate-title" onClick={close}>
          <div className={`about-card gate gate-${pending.kind}`} onClick={(event) => event.stopPropagation()}>
            <h2 id="gate-title">{video ? t("video.warnTitle") : t("gamble.title")}</h2>
            <p>{video ? t("video.warnText") : t("gamble.text")}</p>
            <p className="gate-url muted small no-select" aria-hidden={!video}>
              {pending.url.replace(/^https?:\/\//, "")}
            </p>
            <div className="gate-actions">
              <button type="button" onClick={close} autoFocus>
                {t("action.cancel")}
              </button>
              <button type="button" className="primary" onClick={go} disabled={wait > 0}>
                {wait > 0 ? `${label} (${wait})` : `${label} ↗`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

/** Props for an <a> that opens through the notice instead of directly (used for videos). */
export function useGatedLink() {
  const open = useContext(Context);
  return (url: string, kind: GateKind) => ({
    href: url,
    target: "_blank",
    rel: "noopener noreferrer nofollow",
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!open) return; // no provider: plain link
      event.preventDefault();
      open(url, kind);
    },
  });
}

/**
 * A betting / casino domain shown as plain, non-selectable text (not a link). Clicking it, or pressing
 * Enter on it, opens the disclaimer; the site itself only opens from there.
 */
export function GamblingDomain({ domain }: { domain: string }) {
  const open = useContext(Context);
  const show = () => open?.(`https://${domain}`, "gambling");
  return (
    <span
      className="gambling-domain no-select"
      role="button"
      tabIndex={0}
      onClick={show}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          show();
        }
      }}
      onCopy={(event) => event.preventDefault()}
    >
      {domain}
    </span>
  );
}

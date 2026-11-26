import { nodeColor, type LoadedData } from "../data";
import { LANGUAGES, useI18n } from "../i18n";
import { useGatedLink } from "./LinkGate";
import type { DataNode, HighlightSource, Mention } from "../types";

/** Flag for the language a source is in (ua → Ukraine, de → Germany, …). */
function SourceFlag({ source }: { source?: HighlightSource }) {
  const flag = LANGUAGES.find((l) => l.code === source?.language)?.flag;
  if (!flag) return null;
  return <span className={`fi fi-${flag} flag`} title={source?.language} aria-hidden="true" />;
}

function sourceOf(loaded: LoadedData, id: string): HighlightSource | undefined {
  return loaded.highlights.sources.find((s) => s.id === id);
}

function MentionItem({
  loaded,
  mention,
  onSelect,
  showSource,
}: {
  loaded: LoadedData;
  mention: Mention;
  onSelect: (id: string) => void;
  showSource: boolean;
}) {
  const gated = useGatedLink();
  const { t } = useI18n();
  const source = sourceOf(loaded, mention.source);
  const nodes = mention.nodes.map((id) => loaded.nodes.get(id)).filter((n): n is DataNode => !!n);
  return (
    <li className="mention">
      <div className="mention-head">
        <a {...gated(mention.url, "video")} className="mention-time">
          {mention.time ?? "open"} ↗
        </a>
        {showSource && source && (
          <span className="muted small">
            <SourceFlag source={source} /> {source.title}
          </span>
        )}
      </div>
      <p className="mention-claim">{mention.claim}</p>
      {mention.note && <p className="muted small">{mention.note}</p>}
      {nodes.length > 0 && (
        <div className="people-badges mention-badges">
          {nodes.map((node) => (
            <button key={node.id} type="button" className="person-badge" onClick={() => onSelect(node.id)}>
              <span className="dot" style={{ background: nodeColor(node) }} />
              {node.label}
            </button>
          ))}
        </div>
      )}
      {(mention.unmatched.length > 0 || mention.other.length > 0) && (
        <p className="muted small">
          {t("mentions.notFound")}{" "}
          {[...mention.unmatched.map((u) => u.name), ...mention.other].join(", ")}
        </p>
      )}
    </li>
  );
}

/** Mentions of one node, shown inside its side panel. */
export function NodeMentions({ loaded, id, onSelect }: { loaded: LoadedData; id: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const mentions = loaded.mentionsByNode.get(id);
  if (!mentions?.length) return null;
  return (
    <details className="section">
      <summary>
        ★ {t("mentions.inMedia")}<span className="count">{mentions.length}</span>
      </summary>
      <div className="section-body">
        <p className="muted small">{t("mentions.caution")}</p>
        <ul className="links">
          {mentions.map((mention, i) => (
            <MentionItem key={i} loaded={loaded} mention={mention} onSelect={onSelect} showSource />
          ))}
        </ul>
      </div>
    </details>
  );
}

/** All sources and their mentions; shown when the Mentions filter is on and nothing is selected. */
export function MentionsPanel({ loaded, onSelect, onClose }: { loaded: LoadedData; onSelect: (id: string) => void; onClose: () => void }) {
  const gated = useGatedLink();
  const { t } = useI18n();
  const { sources, mentions } = loaded.highlights;
  return (
    <aside className="panel" aria-label={t("mentions.title")}>
      <header className="panel-head">
        <span className="dot big" style={{ background: "#fbbf24" }} />
        <div>
          <h2>{t("mentions.title")}</h2>
          <p className="muted">
            {t("mentions.summary", { mentions: mentions.length, sources: sources.length, nodes: loaded.mentionsByNode.size })}
          </p>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label={t("action.close")}>
          ×
        </button>
      </header>
      <div className="panel-body">
        <p className="muted small">{t("mentions.caution")}</p>
        {sources.map((source) => (
          <details key={source.id} className="section" open>
            <summary>
              <SourceFlag source={source} /> {source.title}
              <span className="count">{mentions.filter((m) => m.source === source.id).length}</span>
            </summary>
            <div className="section-body">
              <p className="small">
                <a {...gated(source.url, "video")}>
                  {[source.publisher, source.published].filter(Boolean).join(" · ") || source.url} ↗
                </a>
              </p>
              {source.note && <p className="muted small">{source.note}</p>}
              <ul className="links">
                {mentions
                  .filter((m) => m.source === source.id)
                  .map((mention, i) => (
                    <MentionItem key={i} loaded={loaded} mention={mention} onSelect={onSelect} showSource={false} />
                  ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </aside>
  );
}

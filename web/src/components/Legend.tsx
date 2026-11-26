import { useI18n } from "../i18n";

export interface LegendItem {
  shape: "circle" | "diamond" | "line" | "star";
  color: string;
  label: string;
}

/** Small collapsible box in the bottom-left corner explaining colours and shapes. */
export function Legend({ items, note }: { items: LegendItem[]; note?: string }) {
  const { t } = useI18n();
  return (
    <details className="legend" open={window.matchMedia?.("(min-width: 761px)").matches ?? true}>
      <summary>{t("legend.title")}</summary>
      <ul>
        {items.map((item) => (
          <li key={item.label + item.shape}>
            <span className={`legend-swatch ${item.shape}`} style={{ color: item.color }} aria-hidden="true">
              {item.shape === "star" ? "★" : null}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      {note && <p className="muted small">{note}</p>}
    </details>
  );
}

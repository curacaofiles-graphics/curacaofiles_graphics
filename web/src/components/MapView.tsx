import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, MultiLineString } from "geojson";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import type { LoadedData } from "../data";
import { countryLabel, localName } from "../flags";
import { useI18n } from "../i18n";
import { geoView, neighbourhood, type GeoPoint } from "../map/geo";
import { Legend } from "./Legend";

interface Props {
  loaded: LoadedData;
  selected: string | null;
  /** Nodes kept by the country or media filter, like in the graph view. */
  focus: Set<string> | null;
  onSelect: (id: string | null) => void;
}

interface Shapes {
  land: FeatureCollection;
  borders: MultiLineString;
}

// The world outline is only needed here, so it is loaded on first use (Natural Earth 1:110m via world-atlas, ISC).
let shapesPromise: Promise<Shapes> | null = null;
function loadShapes(): Promise<Shapes> {
  shapesPromise ??= import("world-atlas/countries-110m.json").then((module) => {
    const topology = (module.default ?? module) as unknown as Topology<{ countries: GeometryCollection }>;
    return {
      land: feature(topology, topology.objects.countries) as FeatureCollection,
      borders: mesh(topology, topology.objects.countries, (a, b) => a !== b),
    };
  });
  return shapesPromise;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 24;
const LABELS_IN_OVERVIEW = 14;
const LABELS_IN_FOCUS = 24;

export function MapView({ loaded, selected, focus, onSelect }: Props) {
  const { t, lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [shapes, setShapes] = useState<Shapes | null>(null);
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<GeoPoint | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    loadShapes().then(setShapes, () => setShapes(null));
  }, []);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selectedNode = selected ? loaded.nodes.get(selected) : undefined;
  const view = useMemo(() => {
    if (selectedNode) {
      const result = geoView(loaded, neighbourhood(loaded, selectedNode.id), selectedNode.type === "person" ? selectedNode.id : undefined);
      if (selectedNode.type === "country") {
        // The selected country itself is highlighted.
        const own = result.points.find((p) => p.id === `country:${selectedNode.label}`);
        if (own) own.primary = true;
        result.links.forEach((l) => l.from === `country:${selectedNode.label}` && (l.primary = true));
      }
      return result;
    }
    return geoView(loaded, focus);
  }, [loaded, selectedNode, focus]);

  // Start each new selection from the whole world.
  useEffect(() => setZoom({ k: 1, x: 0, y: 0 }), [selected, focus]);

  const projection = useMemo(
    () => geoNaturalEarth1().fitExtent([[8, 8], [size.width - 8, size.height - 8]], { type: "Sphere" }),
    [size],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const byId = useMemo(() => new Map(view.points.map((p) => [p.id, p])), [view]);
  const countryIds = useMemo(() => {
    const out = new Map<string, string>();
    loaded.nodes.forEach((node) => node.type === "country" && out.set(node.label, node.id));
    return out;
  }, [loaded]);

  const maxCount = Math.max(1, ...view.points.map((p) => p.people.length + p.entities.length));
  const radius = (p: GeoPoint) => 3 + (selectedNode ? 11 : 17) * Math.sqrt((p.people.length + p.entities.length) / maxCount);
  const maxWeight = Math.max(1, ...view.links.map((l) => l.weight));
  const screen = (at: [number, number]) => {
    const [x, y] = projection(at) ?? [0, 0];
    return [x * zoom.k + zoom.x, y * zoom.k + zoom.y] as const;
  };
  // Country points on top of a jurisdiction (people living in Curaçao) would print the same name twice.
  const jurisdictions = view.points.filter((p) => p.kind === "jurisdiction");
  const onJurisdiction = (p: GeoPoint) =>
    p.kind === "country" && jurisdictions.some((j) => Math.abs(j.at[0] - p.at[0]) + Math.abs(j.at[1] - p.at[1]) < 3);
  const labelled = new Set(
    view.points
      .filter((p) => !onJurisdiction(p))
      .filter((p, i) => p.primary || p.kind === "jurisdiction" || i < (selectedNode || focus ? LABELS_IN_FOCUS : LABELS_IN_OVERVIEW))
      .map((p) => p.id),
  );

  const zoomAt = (factor: number, cx = size.width / 2, cy = size.height / 2) =>
    setZoom((z) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z.k * factor));
      if (k === MIN_ZOOM) return { k, x: 0, y: 0 };
      const ratio = k / z.k;
      return { k, x: cx - (cx - z.x) * ratio, y: cy - (cy - z.y) * ratio };
    });

  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1.25 : 0.8, event.clientX - rect.left, event.clientY - rect.top);
  };
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || (event.buttons & 1) === 0) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    if (!d.moved) event.currentTarget.setPointerCapture(event.pointerId);
    d.moved = true;
    d.x = event.clientX;
    d.y = event.clientY;
    setZoom((z) => ({ ...z, x: z.x + dx, y: z.y + dy }));
  };
  const onPointerUp = () => {
    window.setTimeout(() => (drag.current = null), 0);
  };

  const choose = (p: GeoPoint) => {
    if (drag.current?.moved) return;
    if (p.kind === "country" && countryIds.has(p.name)) onSelect(countryIds.get(p.name)!);
  };

  const describePoint = (p: GeoPoint) => {
    const parts = [];
    if (p.people.length) {
      const detail = [
        p.residents ? t("map.residents", { n: p.residents }) : "",
        p.passportHolders ? t("map.passports", { n: p.passportHolders }) : "",
      ].filter(Boolean);
      parts.push(`${t("nat.people", { n: p.people.length })}${detail.length ? ` (${detail.join(", ")})` : ""}`);
    }
    if (p.entities.length) parts.push(t(p.name === "Curaçao" ? "map.companies" : "map.holders", { n: p.entities.length }));
    return `${p.kind === "country" ? countryLabel(p.name) : p.name}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
  };

  return (
    <div ref={box} className="map">
      <svg
        width={size.width}
        height={size.height}
        role="img"
        aria-label={t("view.map")}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <g transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`}>
          <path className="map-sphere" d={path({ type: "Sphere" }) ?? undefined} />
          <path className="map-graticule" d={path(geoGraticule10()) ?? undefined} />
          {shapes && (
            <>
              <path className="map-land" d={path(shapes.land) ?? undefined} />
              <path className="map-borders" d={path(shapes.borders) ?? undefined} />
            </>
          )}
          {view.links.map((l) => {
            const a = byId.get(l.from);
            const b = byId.get(l.to);
            if (!a || !b) return null;
            const d = path({ type: "LineString", coordinates: [a.at, b.at] });
            return (
              <path
                key={`${l.from}|${l.to}`}
                className={`map-link${l.primary ? " primary" : ""}${b.kind === "jurisdiction" && a.kind === "jurisdiction" ? " licence" : ""}`}
                d={d ?? undefined}
                strokeWidth={0.6 + 3.4 * Math.sqrt(l.weight / maxWeight)}
              />
            );
          })}
        </g>
        {[...view.points].sort((a, b) => Number(a.kind === "jurisdiction") - Number(b.kind === "jurisdiction")).map((p) => {
          const [x, y] = screen(p.at);
          const r = radius(p);
          const title = describePoint(p);
          return (
            <g
              key={p.id}
              className={`map-point ${p.kind}${p.primary ? " primary" : ""}${p.kind === "country" ? " clickable" : ""}`}
              transform={`translate(${x} ${y})`}
              onClick={() => choose(p)}
              onPointerEnter={() => setHover(p)}
              onPointerLeave={() => setHover((h) => (h?.id === p.id ? null : h))}
            >
              <title>{title}</title>
              {p.kind === "jurisdiction" ? (
                <rect x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} transform="rotate(45)" />
              ) : (
                <circle r={r} />
              )}
              {labelled.has(p.id) && (
                <text x={r + 4} y={4}>
                  {p.kind === "country" ? (localName(p.name, lang.code) ?? p.name) : p.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && <div className="map-hover">{describePoint(hover)}</div>}

      <div className="map-zoom" role="group">
        <button type="button" onClick={() => zoomAt(1.5)} aria-label={t("map.zoomIn")} title={t("map.zoomIn")}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.5)} aria-label={t("map.zoomOut")} title={t("map.zoomOut")}>
          −
        </button>
        <button type="button" onClick={() => setZoom({ k: 1, x: 0, y: 0 })} aria-label={t("map.reset")} title={t("map.reset")}>
          ⟲
        </button>
      </div>

      <Legend
        items={[
          { shape: "circle", color: "var(--map-people)", label: t("map.people") },
          ...(selectedNode?.type === "person" ? [{ shape: "circle" as const, color: "var(--map-primary)", label: t("map.selected") }] : []),
          { shape: "diamond", color: "var(--map-jurisdiction)", label: t("map.jurisdiction") },
          { shape: "line", color: "var(--map-link)", label: t("map.links") },
          { shape: "line", color: "var(--map-licence)", label: t("edge.foreignLicence") },
        ]}
        note={view.unplaced ? `${t("map.note")} ${t("map.unplaced", { n: view.unplaced })}` : t("map.note")}
      />
    </div>
  );
}

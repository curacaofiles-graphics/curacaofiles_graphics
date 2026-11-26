import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { useEffect, useRef } from "react";
import Sigma from "sigma";

import Graph from "graphology";

import type { AppGraph, EdgeAttributes, LoadedData, NodeAttributes } from "../data";
import type { NodeType } from "../types";

interface Props {
  loaded: LoadedData;
  visible: Set<NodeType>;
  selected: string | null;
  /** When set, only these nodes are drawn (nationality filter). */
  focus: Set<string> | null;
  /** Optional colour overrides (people coloured by nationality). */
  colors: Map<string, string> | null;
  onSelect: (id: string | null) => void;
  layoutRunning: boolean;
  onLayoutDone: () => void;
  version: number;
}

const DIM_NODE = "#262b36";

/**
 * Layout of just the filtered nodes, scaled into the full graph's extent so the camera
 * frames it. Each connected group is laid out on its own and the groups are packed
 * side by side, largest first, so unrelated groups no longer sit far apart the way
 * they do in the global layout.
 */
function localLayout(graph: AppGraph, nodes: Set<string>): Map<string, { x: number; y: number }> {
  const sub = new Graph();
  nodes.forEach((id) => {
    if (graph.hasNode(id)) sub.addNode(id, { x: graph.getNodeAttribute(id, "x"), y: graph.getNodeAttribute(id, "y") });
  });
  graph.forEachEdge((_key, _attrs, source, target) => {
    if (sub.hasNode(source) && sub.hasNode(target) && source !== target && !sub.hasEdge(source, target)) {
      sub.addEdge(source, target);
    }
  });

  // Connected components.
  const seen = new Set<string>();
  const components: string[][] = [];
  sub.forEachNode((start) => {
    if (seen.has(start)) return;
    const members: string[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const id = queue.pop()!;
      members.push(id);
      sub.forEachNeighbor(id, (next) => {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }
    components.push(members);
  });
  components.sort((a, b) => b.length - a.length);

  // Lay out each component around (0, 0) with a radius that grows with its size.
  const placed: { members: Map<string, { x: number; y: number }>; radius: number }[] = [];
  for (const members of components) {
    const radius = Math.sqrt(members.length) * 10;
    const local = new Map<string, { x: number; y: number }>();
    if (members.length <= 2) {
      members.forEach((id, i) => local.set(id, { x: (i - (members.length - 1) / 2) * 12, y: 0 }));
    } else {
      const part = sub.copy();
      sub.forEachNode((id) => {
        if (!members.includes(id)) part.dropNode(id);
      });
      forceAtlas2.assign(part, {
        iterations: part.order > 1000 ? 100 : 300,
        settings: { ...forceAtlas2.inferSettings(part), barnesHutOptimize: part.order > 300, gravity: 1 },
      });
      let cx = 0;
      let cy = 0;
      part.forEachNode((_id, a) => {
        cx += a.x / part.order;
        cy += a.y / part.order;
      });
      let far = 1e-6;
      part.forEachNode((_id, a) => {
        far = Math.max(far, Math.hypot(a.x - cx, a.y - cy));
      });
      part.forEachNode((id, a) => local.set(id, { x: ((a.x - cx) / far) * radius, y: ((a.y - cy) / far) * radius }));
    }
    placed.push({ members: local, radius: Math.max(radius, 8) });
  }

  // Shelf-pack the components into rows of roughly square overall shape.
  const totalArea = placed.reduce((sum, p) => sum + (2 * p.radius + 6) ** 2, 0);
  const rowWidth = Math.max(Math.sqrt(totalArea) * 1.3, 2 * (placed[0]?.radius ?? 1) + 6);
  const packed = new Map<string, { x: number; y: number }>();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const { members, radius } of placed) {
    const size = 2 * radius + 6;
    if (x > 0 && x + size > rowWidth) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    members.forEach((p, id) => packed.set(id, { x: x + size / 2 + p.x, y: y + size / 2 + p.y }));
    x += size;
    rowHeight = Math.max(rowHeight, size);
  }

  // Fit into the global extent.
  const extent = (points: Iterable<{ x: number; y: number }>) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const a of points) {
      x0 = Math.min(x0, a.x);
      x1 = Math.max(x1, a.x);
      y0 = Math.min(y0, a.y);
      y1 = Math.max(y1, a.y);
    }
    return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  const all: { x: number; y: number }[] = [];
  graph.forEachNode((_id, a) => all.push(a));
  const g = extent(all);
  const l = extent(packed.values());
  const scale =
    Math.min((g.x1 - g.x0) / Math.max(l.x1 - l.x0, 1e-6), (g.y1 - g.y0) / Math.max(l.y1 - l.y0, 1e-6)) * 0.9;
  const out = new Map<string, { x: number; y: number }>();
  packed.forEach((p, id) => out.set(id, { x: g.cx + (p.x - l.cx) * scale, y: g.cy + (p.y - l.cy) * scale }));
  return out;
}

// Sigma's default hover label is a white box; draw a dark one that matches the page.
function drawHover(
  context: CanvasRenderingContext2D,
  data: { x: number; y: number; size: number; label?: string | null; color: string },
  settings: { labelSize: number; labelFont: string; labelWeight: string },
) {
  const size = settings.labelSize;
  context.font = `${settings.labelWeight} ${size}px ${settings.labelFont}`;
  const label = data.label ?? "";
  const width = label ? context.measureText(label).width + 10 : 0;
  const height = size + 8;
  context.fillStyle = "#1c212b";
  context.strokeStyle = "#8892a6";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(data.x, data.y, data.size + 3, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  if (label) {
    const left = data.x + data.size + 4;
    context.fillRect(left, data.y - height / 2, width, height);
    context.strokeRect(left, data.y - height / 2, width, height);
    context.fillStyle = "#e5e9f0";
    context.fillText(label, left + 5, data.y + size / 3);
  }
  context.fillStyle = data.color;
  context.beginPath();
  context.arc(data.x, data.y, data.size, 0, Math.PI * 2);
  context.fill();
}
const DIM_EDGE = "#1c2029";
const LAYOUT_MS = 6000;
const FORCE_LABELS_UP_TO = 100;

export function GraphView({ loaded, visible, selected, focus, colors, onSelect, layoutRunning, onLayoutDone, version }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const sigma = useRef<Sigma<NodeAttributes, EdgeAttributes> | null>(null);
  const layout = useRef<FA2Layout | null>(null);
  const state = useRef({
    visible,
    selected,
    focus: null as Set<string> | null,
    colors: null as Map<string, string> | null,
    saved: null as Map<string, { x: number; y: number }> | null,
    hovered: null as string | null,
    neighbours: new Set<string>(),
  });

  // Create the renderer once per data set.
  useEffect(() => {
    if (!container.current) return;
    const { graph } = loaded;
    const renderer = new Sigma<NodeAttributes, EdgeAttributes>(graph, container.current, {
      labelColor: { color: "#d8dee9" },
      labelSize: 12,
      labelRenderedSizeThreshold: 9,
      defaultEdgeColor: "#3b4252",
      zIndex: true,
      defaultDrawNodeHover: drawHover,
      nodeReducer: (node, data) => {
        const s = state.current;
        const res: Partial<NodeAttributes> & { hidden?: boolean; highlighted?: boolean; forceLabel?: boolean; zIndex?: number } = {
          ...data,
        };
        if (node !== s.selected && (!s.visible.has(data.nodeType) || (s.focus && !s.focus.has(node)))) {
          res.hidden = true;
          return res;
        }
        if (loaded.mentionsByNode.has(node)) {
          res.label = `★ ${data.label}`;
          if (s.focus) res.forceLabel = true;
        }
        const override = s.colors?.get(node);
        if (override) res.color = override;
        // A small filtered set is readable with every label on.
        if (s.focus && s.focus.size <= FORCE_LABELS_UP_TO) res.forceLabel = true;
        const active = s.selected ?? s.hovered;
        if (active) {
          if (node === active) {
            res.highlighted = true;
            res.zIndex = 2;
          } else if (s.neighbours.has(node)) {
            res.zIndex = 1;
            res.forceLabel = true;
          } else {
            res.color = DIM_NODE;
            res.label = "";
            res.zIndex = 0;
          }
        }
        return res;
      },
      edgeReducer: (edge, data) => {
        const s = state.current;
        const res: Partial<EdgeAttributes> & { hidden?: boolean } = { ...data };
        const [source, target] = graph.extremities(edge);
        const sourceType = graph.getNodeAttribute(source, "nodeType");
        const targetType = graph.getNodeAttribute(target, "nodeType");
        const shown = (id: string, type: NodeAttributes["nodeType"]) =>
          id === s.selected || (s.visible.has(type) && (!s.focus || s.focus.has(id)));
        if (!shown(source, sourceType) || !shown(target, targetType)) {
          res.hidden = true;
          return res;
        }
        const active = s.selected ?? s.hovered;
        if (active) {
          if (source === active || target === active) {
            res.color = "#8892a6";
            res.size = (data.size ?? 1) + 0.6;
          } else {
            res.color = DIM_EDGE;
          }
        }
        return res;
      },
    });

    renderer.on("clickNode", ({ node }) => onSelect(node));
    renderer.on("clickStage", () => onSelect(null));
    renderer.on("enterNode", ({ node }) => {
      state.current.hovered = node;
      if (!state.current.selected) state.current.neighbours = new Set(graph.neighbors(node));
      renderer.refresh({ skipIndexation: true });
    });
    renderer.on("leaveNode", () => {
      state.current.hovered = null;
      if (!state.current.selected) state.current.neighbours = new Set();
      renderer.refresh({ skipIndexation: true });
    });
    sigma.current = renderer;

    return () => {
      layout.current?.kill();
      layout.current = null;
      renderer.kill();
      sigma.current = null;
    };
    // onSelect is stable (setState); recreate only for a new data set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Force-directed layout in a web worker.
  useEffect(() => {
    if (!layoutRunning) {
      layout.current?.stop();
      return;
    }
    const { graph } = loaded;
    if (!layout.current) {
      const settings = forceAtlas2.inferSettings(graph);
      layout.current = new FA2Layout(graph, {
        settings: { ...settings, barnesHutOptimize: true, slowDown: 5, gravity: 0.5, scalingRatio: 8 },
      });
    }
    layout.current.start();
    const timer = window.setTimeout(() => {
      layout.current?.stop();
      onLayoutDone();
    }, LAYOUT_MS);
    return () => window.clearTimeout(timer);
  }, [layoutRunning, loaded, onLayoutDone]);

  // Selection, filters and graph changes (expanded domains).
  useEffect(() => {
    const renderer = sigma.current;
    if (!renderer) return;
    const { graph } = loaded;
    state.current.visible = visible;
    state.current.selected = selected;
    state.current.neighbours = selected && graph.hasNode(selected) ? new Set(graph.neighbors(selected)) : new Set();
    renderer.refresh();
    if (selected && graph.hasNode(selected)) {
      const display = renderer.getNodeDisplayData(selected);
      if (display) {
        renderer.getCamera().animate({ x: display.x, y: display.y, ratio: Math.min(renderer.getCamera().ratio, 0.35) }, { duration: 500 });
      }
    }
  }, [loaded, visible, selected, version]);

  // Nationality filter: lay the remaining nodes out on their own and frame them.
  useEffect(() => {
    const renderer = sigma.current;
    if (!renderer) return;
    const previous = state.current.focus;
    state.current.focus = focus;
    state.current.colors = colors;
    if (previous === focus) return;
    // Move the filtered nodes to a layout of their own; put them back when the filter changes.
    const { graph } = loaded;
    state.current.saved?.forEach((p, id) => {
      if (graph.hasNode(id)) graph.mergeNodeAttributes(id, p);
    });
    state.current.saved = null;
    if (focus && focus.size > 0) {
      const local = localLayout(graph, focus);
      const saved = new Map<string, { x: number; y: number }>();
      local.forEach((p, id) => {
        saved.set(id, { x: graph.getNodeAttribute(id, "x"), y: graph.getNodeAttribute(id, "y") });
        graph.mergeNodeAttributes(id, p);
      });
      state.current.saved = saved;
    }
    renderer.refresh();
    const camera = renderer.getCamera();
    if (!focus || focus.size === 0) {
      if (previous) camera.animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { duration: 500 });
      return;
    }
    // A selected node (e.g. from a shared link) wins: centre on it.
    const chosen = state.current.selected;
    if (chosen && loaded.graph.hasNode(chosen)) {
      const display = renderer.getNodeDisplayData(chosen);
      if (display) {
        camera.animate({ x: display.x, y: display.y, ratio: 0.3, angle: 0 }, { duration: 500 });
        return;
      }
    }
    // Frame the filtered nodes from their on-screen (normalised) positions.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    focus.forEach((id) => {
      const display = renderer.getNodeDisplayData(id);
      if (!display) return;
      minX = Math.min(minX, display.x);
      maxX = Math.max(maxX, display.x);
      minY = Math.min(minY, display.y);
      maxY = Math.max(maxY, display.y);
    });
    if (minX === Infinity) return;
    const ratio = Math.min(1.2, Math.max(0.05, Math.max(maxX - minX, maxY - minY) * 1.15));
    camera.animate({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, ratio, angle: 0 }, { duration: 500 });
  }, [loaded, focus, colors]);

  return <div ref={container} className="graph" />;
}

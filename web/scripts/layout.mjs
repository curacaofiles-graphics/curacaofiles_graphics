// Precompute node positions for public/data/graph.json with ForceAtlas2,
// so the viewer opens with a finished layout instead of running it in the browser.
//
//   node scripts/layout.mjs [path/to/graph.json] [--iterations 600]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import graphology from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

const args = process.argv.slice(2);
const iterationsAt = args.indexOf("--iterations");
const iterations = iterationsAt >= 0 ? Number(args[iterationsAt + 1]) : 600;
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--iterations")
  ?? fileURLToPath(new URL("../public/data/graph.json", import.meta.url));

const data = JSON.parse(readFileSync(file, "utf8"));
const graph = new graphology.MultiGraph();
const count = data.nodes.length;

data.nodes.forEach((node, index) => {
  // Same golden-angle spiral the viewer uses as a fallback.
  const angle = index * 2.399963;
  const radius = Math.sqrt(index / count) * 100;
  graph.addNode(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
});
for (const edge of data.edges) {
  if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.addEdge(edge.source, edge.target);
}

const started = Date.now();
const settings = {
  ...forceAtlas2.inferSettings(graph),
  barnesHutOptimize: true,
  gravity: 0.5,
  scalingRatio: 8,
  slowDown: 5,
};
forceAtlas2.assign(graph, { iterations, settings });

const round = (v) => Math.round(v * 10) / 10;
for (const node of data.nodes) {
  const { x, y } = graph.getNodeAttributes(node.id);
  node.x = round(x);
  node.y = round(y);
}
data.meta.layout = { algorithm: "ForceAtlas2", iterations };
writeFileSync(file, JSON.stringify(data));
console.log(`laid out ${graph.order} nodes / ${graph.size} edges in ${((Date.now() - started) / 1000).toFixed(1)} s -> ${file}`);

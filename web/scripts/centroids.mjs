// Writes src/map/centroids.json: ISO 3166-1 alpha-2 code -> [longitude, latitude] of a point inside the
// country's main landmass, used to pin countries on the map view.
//
//   node scripts/centroids.mjs
//
// Shapes: world-atlas (Natural Earth 1:50m, ISC). Numeric -> alpha-2 codes: i18n-iso-countries (MIT).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { geoArea, geoCentroid } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const shapes = feature(topology, topology.objects.countries).features;

// Places without an ISO numeric code in Natural Earth, or that are not countries but licensing
// jurisdictions used in the data.
const EXTRA = {
  gi: [-5.35, 36.14], // Gibraltar
  xk: [20.9, 42.6], // Kosovo
  "x-anjouan": [44.42, -12.22], // Anjouan, Comoros
  "x-kahnawake": [-73.68, 45.41], // Kahnawà:ke, Quebec, Canada
};

const out = {};
for (const shape of shapes) {
  const code = countries.numericToAlpha2(String(shape.id ?? "").padStart(3, "0"));
  if (!code) continue;
  // The centroid of the largest polygon keeps overseas territories (France, Netherlands, US…) from
  // pulling the point into the sea.
  const polygons =
    shape.geometry.type === "MultiPolygon"
      ? shape.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
      : [shape.geometry];
  const largest = polygons.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  const [lon, lat] = geoCentroid(largest);
  out[code.toLowerCase()] = [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100];
}
Object.assign(out, EXTRA);

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
const target = fileURLToPath(new URL("../src/map/centroids.json", import.meta.url));
writeFileSync(target, JSON.stringify(sorted) + "\n");
console.log(`${Object.keys(sorted).length} points -> ${target}`);

#!/usr/bin/env node
/**
 * Tiny stateless SVG-to-PNG rasteriser. Reads SVG from stdin, writes PNG
 * bytes to stdout. Both the TS golden-regeneration script and the Python
 * equivalence test shell out to this so the rasterisation engine is identical
 * across languages — that way pixel differences can only come from the
 * renderer being tested, not from text-shaping or anti-aliasing variance.
 *
 * Usage:
 *   cat input.svg | node svg-to-png.mjs > output.png
 *   node svg-to-png.mjs --width 1200 < input.svg > output.png
 */

import { svgToPng } from "./svg-to-png-lib.mjs";

const args = process.argv.slice(2);
let width = 1200;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--width" && args[i + 1]) {
    width = parseInt(args[i + 1], 10);
    i++;
  }
}

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  const svg = Buffer.concat(chunks).toString("utf-8");
  process.stdout.write(svgToPng(svg, { width }));
});

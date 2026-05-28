#!/usr/bin/env node
/**
 * Regenerate cross-language test artefacts and contact sheet.
 *
 * For each tests/shared/configs/tier-NN-*.json:
 *   1. Render via the TS package; rasterise via shared svg-to-png-lib; write
 *      tests/shared/goldens/ts/<tier>.{svg,png}.
 *   2. Shell out to python/.venv/bin/python tests/shared/build-py-renders.py
 *      which renders + rasterises with the Python implementation and writes
 *      tests/shared/goldens/py/<tier>.{svg,png} plus a diff heatmap at
 *      tests/shared/goldens/diff/<tier>.png.
 *   3. Write a 3-up contact sheet (TS | diff | Python) per tier so any
 *      cross-language divergence is visible at a glance.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderDiagram } from "../../dist/index.js";
import { svgToPng } from "./svg-to-png-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const configsDir = join(__dirname, "configs");
const goldensRoot = join(__dirname, "goldens");
const tsDir = join(goldensRoot, "ts");
const pyDir = join(goldensRoot, "py");
const diffDir = join(goldensRoot, "diff");
const targetPngWidth = 1200;

for (const d of [tsDir, pyDir, diffDir]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const tierFiles = readdirSync(configsDir)
  .filter((f) => f.startsWith("tier-") && f.endsWith(".json"))
  .sort();

if (tierFiles.length === 0) {
  console.error(`no tier configs found in ${configsDir}`);
  process.exit(1);
}

const sheetRows = [];

// --- Phase 1: render TS goldens ---------------------------------------------
console.log("Rendering TypeScript goldens...");
for (const filename of tierFiles) {
  const tierName = filename.replace(/\.json$/, "");
  const configPath = join(configsDir, filename);
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  const comment = raw._comment || "";
  delete raw._comment;

  let svg;
  try {
    svg = renderDiagram(raw);
  } catch (err) {
    console.error(`✗ ${tierName}: TS render failed — ${err.message}`);
    process.exit(1);
  }

  writeFileSync(join(tsDir, `${tierName}.svg`), svg, "utf-8");
  const pngData = svgToPng(svg, { width: targetPngWidth });
  writeFileSync(join(tsDir, `${tierName}.png`), pngData);

  console.log(`  ✓ ${tierName} → ${svg.length} chars SVG / ${pngData.length} bytes PNG`);
  sheetRows.push({ tierName, comment });
}

// --- Phase 2: render Python side, compute diffs ------------------------------
const pythonBin = join(repoRoot, "python", ".venv", "bin", "python");
if (existsSync(pythonBin)) {
  console.log("\nRendering Python side + diffs...");
  const res = spawnSync(pythonBin, [join(__dirname, "build-py-renders.py")], {
    stdio: "inherit",
    cwd: repoRoot,
  });
  if (res.status !== 0) {
    console.error("Python phase failed; contact sheet will be TS-only.");
  }
} else {
  console.log(
    `\nSkipping Python phase: ${pythonBin} not found. ` +
      `Run \`python3 -m venv python/.venv && python/.venv/bin/pip install -e python[dev]\` to enable.`
  );
}

// --- Phase 3: write 3-up contact sheet --------------------------------------
const sheetPath = join(goldensRoot, "contact-sheet.html");
const sheetDir = dirname(sheetPath);
const relTo = (p) => p.replace(`${sheetDir}/`, "");
const pyAvailable = existsSync(pyDir) && readdirSync(pyDir).some((f) => f.endsWith(".png"));

const rowsHtml = sheetRows
  .map(({ tierName, comment }) => {
    const tsPng = relTo(join(tsDir, `${tierName}.png`));
    const pyPng = relTo(join(pyDir, `${tierName}.png`));
    const diffPng = relTo(join(diffDir, `${tierName}.png`));
    const tsExists = existsSync(join(tsDir, `${tierName}.png`));
    const pyExists = existsSync(join(pyDir, `${tierName}.png`));
    const diffExists = existsSync(join(diffDir, `${tierName}.png`));

    const cell = (label, src, exists) =>
      `<figure class="cell ${exists ? "" : "missing"}">
        <figcaption>${label}</figcaption>
        ${exists ? `<img src="${src}" alt="${tierName} ${label}" />` : `<div class="placeholder">missing</div>`}
      </figure>`;

    return `<section>
  <header>
    <h2>${tierName}</h2>
    <p>${comment.replace(/</g, "&lt;")}</p>
  </header>
  <div class="grid">
    ${cell("TypeScript", tsPng, tsExists)}
    ${cell("Diff (red = mismatch)", diffPng, diffExists)}
    ${cell("Python", pyPng, pyExists)}
  </div>
</section>`;
  })
  .join("\n");

const sheetHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>radial-diagram — cross-language contact sheet</title>
  <style>
    body { font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; max-width: 1600px; margin: 2em auto; padding: 0 1em; color: #222; background: #fafafa; }
    h1 { font-size: 1.4em; margin-bottom: 0.2em; }
    .lead { color: #555; margin-bottom: 2em; }
    section { margin: 2em 0; padding: 1em; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; }
    section > header h2 { margin: 0 0 0.3em; font-family: ui-monospace, SF Mono, Menlo, monospace; font-size: 1.1em; }
    section > header p { color: #555; margin: 0 0 1em; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1em; }
    figure { margin: 0; display: flex; flex-direction: column; gap: 0.4em; }
    figcaption { font-size: 0.85em; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    figure img { width: 100%; height: auto; background-image: linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; border: 1px solid #ddd; border-radius: 4px; }
    figure.missing .placeholder { padding: 4em 1em; text-align: center; color: #999; background: #f5f5f5; border: 1px dashed #ccc; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>radial-diagram — cross-language contact sheet</h1>
  <p class="lead">Each tier turns on one additional feature on top of the previous. Diff column highlights pixels where Python and TypeScript output differ — empty (checkered transparent) means visual equivalence. Checker background is a transparency indicator: any opaque white area in the TS or Python column would normally be transparent. ${pyAvailable ? "" : "<strong>Python column not rendered — install the Python venv to populate it.</strong>"}</p>
  ${rowsHtml}
</body>
</html>`;
writeFileSync(sheetPath, sheetHtml, "utf-8");
console.log(`\nContact sheet → ${sheetPath}`);

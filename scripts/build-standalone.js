#!/usr/bin/env node
/**
 * Build script: produce demo/radial-diagram.html as a single self-contained
 * page (no external module imports) by reading demo/editor.html as the
 * source-of-truth template and inlining the renderer into its <script>.
 *
 * The renderer is taken from the already-compiled output in dist/, so this
 * step relies on `tsc` having run first. `npm run build` chains them.
 *
 * editor.html stays usable as a dev-mode page (loads dist/ via ES modules);
 * this build is what gets uploaded to the public site.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------- Read sources ----------
const editorHtml = readFileSync(join(ROOT, 'demo/editor.html'), 'utf-8');
const exampleJson = readFileSync(join(ROOT, 'demo/configs/example.json'), 'utf-8');

// dist/ is produced by tsc. Bail with a clear message if it's missing.
const distFiles = ['dist/core/geometry.js', 'dist/core/types.js', 'dist/renderers/svg.js'];
for (const f of distFiles) {
  if (!existsSync(join(ROOT, f))) {
    console.error(`Missing ${f}. Run \`npm run build\` (or \`tsc\`) first.`);
    process.exit(1);
  }
}

// Read each compiled module, drop ESM glue (imports, exports), and concat.
function readModule(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf-8')
    // Strip import statements — we're concatenating everything into one scope.
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    // Strip the `export` keyword so symbols become locals in this scope.
    .replace(/^export\s+(class|function|const|let|var)/gm, '$1')
    // Strip bare `export {}` lines.
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .trim();
}

const inlinedRenderer = `
    // ============================================================
    // Inlined renderer (auto-generated from dist/ — do not edit)
    // ============================================================
${readModule('dist/core/geometry.js')}

${readModule('dist/core/types.js')}

${readModule('dist/renderers/svg.js')}
`;

// Parse example config (drop the demo metadata keys for cleanliness).
const exampleConfig = JSON.parse(exampleJson.replace(/^\s*"_[^"]*":\s*"[^"]*",?\s*$/gm, ''));

// ---------- Transform editor.html ----------
let html = editorHtml;

// 1. Add a header comment so it's clear this file is generated.
html = html.replace(
  /^<!DOCTYPE html>\s*<!--[\s\S]*?-->/m,
  `<!DOCTYPE html>
<!--
  Radial Diagram Generator - Single-file editor.

  AUTO-GENERATED from demo/editor.html and dist/. Do not edit directly.
  Run: npm run build

  @license MIT
  @copyright 2026 CGA Management Ltd
  @see https://www.cgamanagement.co.uk/category/tools
-->`,
);

// 2. Drop ES module imports — we'll inline the symbols instead.
html = html.replace(
  /import\s*\{\s*SVGRenderer\s*\}\s*from\s*['"]\.\.\/dist\/renderers\/svg\.js['"];\s*\n/,
  '',
);
html = html.replace(
  /import\s*\{\s*createConfig\s*\}\s*from\s*['"]\.\.\/dist\/core\/types\.js['"];\s*\n/,
  '',
);

// 3. Remove the type="module" attribute since we no longer use imports.
html = html.replace(/<script type="module">/, '<script>');

// 4. Inject inlined renderer at the top of the editor's script body.
html = html.replace(
  /<script>(\s*\n)/,
  `<script>$1${inlinedRenderer}\n`,
);

// 5. Replace the editor's hardcoded DEFAULT_CONFIG with the parsed example.json
//    so the deployed page boots with the showcase config.
const exampleConfigJs = JSON.stringify(exampleConfig, null, 6)
  .split('\n')
  .map((line, i) => (i === 0 ? line : '    ' + line))
  .join('\n');

const defaultConfigBlock = /const\s+DEFAULT_CONFIG\s*=\s*\{[\s\S]*?\n\s*\};\s*$/m;
if (!defaultConfigBlock.test(html)) {
  console.error('Could not find DEFAULT_CONFIG in editor.html — aborting.');
  process.exit(1);
}
html = html.replace(defaultConfigBlock, `const DEFAULT_CONFIG = ${exampleConfigJs};`);

// ---------- Write ----------
writeFileSync(join(ROOT, 'demo/radial-diagram.html'), html);
console.log('Built demo/radial-diagram.html from demo/editor.html + dist/');

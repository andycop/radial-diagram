# Cross-language test harness

This directory contains the shared fixtures and tooling used to keep every language port of the radial-diagram renderer producing the same image.

## The idea

The **TypeScript renderer is the canonical implementation**. New features get built and visually tuned there first. Once a feature looks right, every other language port (currently Python; potentially more later) must produce a visually identical image for the same config.

## Layout

```
tests/shared/
  configs/                       # progressive tier configs (see below)
    tier-00-minimal.json
    tier-01-scores.json
    …
    tier-10-full.json
  goldens/
    ts/
      tier-00-minimal.svg        # SVG produced by the TS renderer
      tier-00-minimal.png        # PNG rasterisation of the SVG
      …
    contact-sheet.html           # browser-viewable index of every golden
  diff.py                        # rasteriser + pixel-diff utility (used by Python tests)
  svg-to-png.mjs                 # stdin → stdout PNG rasteriser
  svg-to-png-lib.mjs             # rasteriser as a library (used by regen script)
  regenerate-ts-goldens.mjs      # rebuilds TS goldens + contact sheet
```

## The progressive tier ladder

Each `tier-NN-<name>.json` config turns on **one additional feature** on top of the previous tier. If a tier fails, you can binary-search to the exact feature that broke. The current ladder:

| Tier | Adds                                                           |
| ---- | -------------------------------------------------------------- |
| 00   | Bare minimum — 2 segments, 1 facet each, no scores, everything else off. **Foundation case, held stable across releases.** |
| 01   | Facet scores → score fills appear                              |
| 02   | Concentric ring grid lines                                     |
| 03   | Score labels (1..N) on each ring                               |
| 04   | Segment dividers, facet dividers, facet points; multi-facet    |
| 05   | Outer segment label band (4 segments, all four quadrants)      |
| 06   | Inner segment label band (anchored to hub edge)                |
| 07   | Multi-line labels (center, segment, facet) + ampersand escape  |
| 08   | Flow arrows on inner boundaries (clockwise, no wrap)           |
| 09   | Flow arrows with wrap-around (close-loop, counterclockwise)    |
| 10   | Kitchen sink — everything + background + center border + labelColor overrides |
| 11   | Alpha (transparent-channel export case)                                        |
| 12   | Single-ring wheel: curved section sub-labels + configurable track opacity      |
| 13   | Two-level diagnostic (variant 2b): outer-edge facet labels (uppercase, weight, wrap), rotated per-facet figures, section sub-labels, lightened fills |

## Workflow when building a new feature

1. **Build the feature in TypeScript** (`src/renderers/svg.ts`). Run `npm run demo` and visually iterate until it looks right.
2. **Add a new tier config** in `configs/` (or extend tier-10) that exercises the new feature.
3. **Regenerate the goldens**: `npm run regenerate-goldens`. Open `tests/shared/goldens/contact-sheet.html` in a browser and confirm the new tier looks the way you want.
4. **Port the feature** to other languages (currently Python at `python/radial_diagram/svg.py`).
5. **Run the equivalence test**: `cd python && .venv/bin/python -m pytest tests/test_equivalence.py -v`. Every tier must pass.

If the equivalence test fails for a tier, a side-by-side `<tier>.diff.png` is written to `goldens/diff/` so you can eyeball exactly where the divergence is.

## Rasterisation

Both sides rasterise through the same Node helper (`svg-to-png.mjs`), backed by [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js) — a Rust-based renderer with deterministic text shaping across platforms. This means any pixel difference between TS and Python output can only come from the renderer being tested, not from font-rendering variance.

## Tolerance

The equivalence test allows at most **0.5% of pixels** to differ by more than **5/255 per channel** (`FRAC_DIFFERING_LIMIT`, `CHANNEL_THRESHOLD` in `python/tests/test_equivalence.py`). This budget absorbs subpixel anti-aliasing nudges introduced by float-formatting differences between JavaScript and Python, but catches any real visual divergence.

## Commands cheat sheet

```bash
# from repo root
npm install                        # one-time, installs @resvg/resvg-js

npm run regenerate-goldens         # rebuild TS SVG+PNG + contact sheet
open tests/shared/goldens/contact-sheet.html

cd python && .venv/bin/python -m pytest tests/ -v   # full Python test suite
.venv/bin/python -m pytest tests/test_equivalence.py -v   # equivalence only
```

# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.4.0

### Added

- **Python port.** A stdlib-only Python implementation of the renderer
  lives in `python/`, mirroring the public API of `src/index.ts`. The
  same JSON config produces visually identical SVG, so server-side
  callers (e.g. PDF report pipelines) can render diagrams without
  spinning up Node.
- **Cross-language test harness.** New `tests/shared/` directory holds
  a progressive tier ladder of fixtures (`tier-00-minimal` →
  `tier-11-alpha`), where each tier turns on one additional feature on
  top of the previous. Both renderers rasterise through the same
  `@resvg/resvg-js` helper, and a `npm run regenerate-goldens` command
  produces a 3-up (TS | diff | Python) HTML contact sheet for visual
  eyeballing. Current state: pixel-identical output across every tier.

## 2.3.4

### Fixed

- **Segment labels follow flow.** When `style.flowDirection` is set,
  each segment label is now shifted in the flow direction by half the
  arrow's tip extent, so the label stays visually centred over the
  segment-plus-arrow combined extent instead of crowding the trailing
  edge.

## 2.3.3

### Fixed

- **Segment dividers no longer cut through flow arrows.** When
  `style.flowDirection` is set, the radial divider line at every
  boundary that carries a flow arrow is suppressed (both the main
  wedge divider and the band's own divider). The wrap-around boundary
  still draws a divider when `flowCloseLoop` is `false` because no
  arrow sits there.

## 2.3.2

### Fixed

- **Flow arrow base no longer shows a stroke through the fill.** SVG strokes
  centre on the path edge, which painted half the divider-coloured outline
  inside the filled triangle as a vertical line through the arrow. Arrows
  now stroke only the two slanted edges (baseInner → tip → baseOuter); the
  base side stays unstroked.

## 2.3.1

### Changed

- **Flow arrows redesigned.** Arrows now sit on the dimension label band
  (outer band for `segmentLabelPosition: 'outer'`, inner band for
  `'inner'`), making them feel attached to the labelled segment. Each
  arrow defaults to the source segment's `labelColor || color`, gets the
  `segmentDividerColor` outline, and the default tip length is the band
  thickness — so the arrow is roughly as long tangentially as the
  segment is "tall" radially. `style.flowArrowSize` still overrides;
  `style.flowArrowColor` still forces a single colour for all arrows.

## 2.3.0

### Added

- **Flow arrows.** New `style.flowDirection` option (`'clockwise'` |
  `'counterclockwise'`) draws a small triangular arrow on each
  segment-to-segment boundary, indicating flow around the wheel.
  Companion options:
  - `style.flowCloseLoop` (default `false`) — when `true`, the
    arrow that wraps from the last segment back to the first is
    also drawn.
  - `style.flowArrowColor` — falls back to `segmentDividerColor`.
  - `style.flowArrowSize` — default `14`px.
  Exposed in the editor as a new "Style — Flow arrows" section.

## 2.2.0

### Added

- **Form-driven editor** — new `demo/editor.html` provides a full UI for
  building/editing a config: collapsible sections for general / centre /
  scale / style, plus dynamic add/remove/reorder of segments and facets.
  Loads the renderer via ES modules in dev mode.
- **Single-file standalone is now the editor.** `scripts/build-standalone.js`
  has been rewritten to take `demo/editor.html` as the source-of-truth template
  and inline the compiled renderer from `dist/` into it. The output
  `demo/radial-diagram.html` remains a single self-contained file you can
  upload to a static host. This replaces the previous JSON-textarea-only
  standalone with a more capable UI (which still includes a JSON paste/edit
  panel underneath the preview).
- **Import JSON** — the editor accepts JSON via either a file picker
  (`Import JSON…` button) or paste-into-the-mirror plus `Apply JSON`.
- **Download PNG** — bundled as a toolbar button alongside Download SVG.
  Useful for PowerPoint/Keynote, which silently drop SVG `<textPath>`
  segment labels.
- **Transparent PNG export** — clearing the Background field now produces
  a PNG with a real alpha channel (no rectangle, no chroma-key fringe).

### Changed

- The build script no longer regex-strips TypeScript by hand — it reads
  the already-compiled JS from `dist/` and concatenates it into the
  standalone, which is more robust against TS syntax variations.

## 2.1.0

### Added

- **`segment.labelColor`** (optional). Overrides the fill of that segment's
  dimension label band. Falls back to `segment.color` when unset, so existing
  configs render unchanged. Useful for giving labels a darker/lighter band than
  the wedge for legibility.

## 2.0.0

### Breaking changes

- **Centre hub line breaks now use `\n` instead of `&`.** Previously the centre
  hub label was split into two lines on `&`, with `& ` re-prepended to the
  second line. That implicit behaviour is gone — `&` is now rendered as a
  literal character. To preserve a two-line layout like `"Foo & Bar"`, change
  the label to `"Foo\n& Bar"`.

  All bundled demo configs have been migrated.

### Added

- **Multi-line labels.** `\n` in `center.label`, segment names and facet names
  now produces a stacked layout. Centre hub and facet labels stack with
  `<tspan>`s; dimension (segment) labels stack along the band radius, with each
  line on its own curved arc. The dimension band grows by one line-height for
  each extra line so padding remains balanced.

- **`style.segmentLabelPosition`** option:
  - `"outer"` (default, unchanged): the labelled colour band sits outside the
    wheel.
  - `"inner"`: the labelled colour band sits between the centre hub and the
    facet area, with ring dividers on both edges. Suits framework-style
    diagrams where dimensions wrap the centre hub.

### Changed

- The single-file standalone build (`demo/radial-diagram.html`) is regenerated
  to match the new renderer behaviour.

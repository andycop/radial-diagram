# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.5.0

### Added

Opt-in rendering options for the CGA "wheel redesign" (variant 2b). Every
existing config renders byte-identical unless one of these new options is used.

- **Curved section sub-label.** `segment.subLabel` (string) renders a second
  curved line directly below the section name on the coloured band (slightly
  smaller radius, same curve), at regular weight. The renderer prints the
  string verbatim, so the caller supplies e.g. a section average `"3.7"` or a
  percentage `"74%"`. Styled with `style.segmentSubLabelColor` (default
  `#ffffff`) and `style.segmentSubLabelFontScale` (default `0.62`, a fraction
  of the auto-scaled section-name size). The label band grows by one
  sub-line-height only when a sub-label is present.
- **Outer-edge facet labels.** `style.facetLabelPlacement: 'outer-edge'`
  switches facet labels to read radially along the outer edge of each petal,
  right-aligned to the coloured band and kept upright on every side. In that
  mode: `style.facetLabelUppercase` (default `true`),
  `style.facetLabelWeight` (default `700`), `style.facetLabelLetterSpacing`
  (default `'0.04em'`), and `style.facetLabelWrap` (default `true`,
  auto-wraps multi-word labels onto two balanced lines and keeps a trailing
  `&` with the word before it, e.g. `"DIRECTION &"` / `"PURPOSE"`; an explicit
  `\n` still wins). Colour comes from `style.facetFontColor` (defaults to
  `#555555` in this mode). The default `'default'` placement is the original
  italic behaviour, unchanged.
- **Per-facet figure ring.** `facet.figure` (string) draws a small figure
  (raw score or percentage) in a tidy ring just outside the centre hub at the
  facet's mid-angle, with no circle/ring/background. Options:
  `style.facetFigureFontSize` (default `12`), `style.facetFigureColor`
  (default `#555555`), `style.facetFigureGap` (radial gap from the hub edge,
  default = the figure font size), and `style.facetFigureRotate` (default
  `false`; when `true`, figures follow the spoke direction, upright-flipped on
  the bottom/left half). The figure layer is only emitted when at least one
  facet supplies a `figure`.
- **Configurable unscored-track opacity.** `style.trackOpacity` (default
  `0.3`) sets the opacity of the unscored segment background track,
  independently of `style.facetOpacity` (the scored fill).

### Notes

- Hiding the 1-5 scale axis numbers on the top spine needs no new option:
  set the existing `style.showScoreLabels` to `false`.
- Per-segment band colouring by score band is done caller-side by passing the
  desired `segment.color` / `segment.labelColor`; no renderer change needed.

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

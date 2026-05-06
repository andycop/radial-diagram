# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

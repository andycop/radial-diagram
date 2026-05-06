# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

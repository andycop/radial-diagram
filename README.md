# Radial Diagram Generator

A configurable circular/radial diagram generator that outputs SVG. Useful for maturity models, capability assessments, radar charts, and similar visualizations.

<p align="center">
  <img src="docs/radial-diagram.png" alt="Example radial diagram" width="400">
</p>

## Installation

```bash
npm install radial-diagram
```

A Python port lives in [`python/`](python/) for server-side use (e.g. generating PDF reports). It accepts the same JSON config and produces visually identical SVG — see [python/README.md](python/README.md).

## Quick Start (Development)

Clone the repository and run the interactive demo:

```bash
git clone https://github.com/andycop/radial-diagram.git
cd radial-diagram
npm install
npm run build
npm run demo
```

Open <http://localhost:3000> (redirects to the demo page).

## Standalone Version

A self-contained single-file HTML version is available at [`demo/radial-diagram.html`](demo/radial-diagram.html). This file has no dependencies and can be hosted anywhere or opened directly from the filesystem.

The standalone file is auto-generated from the source files. To rebuild after making changes:

```bash
npm run build:standalone
```

This runs automatically as part of `npm run build`.

## Development

```bash
npm run dev    # watches src/, rebuilds on change, and serves demo
npm test       # run unit tests
```

### Cross-language test harness

Each language implementation (TypeScript, Python, …) is held to producing the same image for the same config via a tier-based golden test harness. TypeScript is the canonical implementation; new features get built there first.

```bash
npm run regenerate-goldens                       # rebuild TS goldens + contact sheet
open tests/shared/goldens/contact-sheet.html     # eyeball every tier side by side
cd python && .venv/bin/python -m pytest tests/   # full Python suite incl. equivalence
```

See [tests/shared/README.md](tests/shared/README.md) for the tier ladder and the workflow when adding a new feature.

## Configuration

The diagram is configured via JSON. See `demo/configs/example.json` for a complete example.

### Root Options

| Property     | Type   | Description                                     |
| ------------ | ------ | ----------------------------------------------- |
| `size`       | number | Diagram size in pixels (width = height)         |
| `startAngle` | number | Starting angle in degrees (-90 = top)           |
| `center`     | object | Center hub configuration                        |
| `scale`      | object | Score scale configuration                       |
| `segments`   | array  | Outer segments with facets                      |
| `style`      | object | Visual styling options                          |

### Center Hub (`center`)

| Property      | Type    | Default    | Description                                     |
| ------------- | ------- | ---------- | ----------------------------------------------- |
| `label`       | string  |            | Text displayed in center                        |
| `radius`      | number  |            | Hub radius in pixels                            |
| `color`       | string  |            | Fill color (supports alpha, e.g., `#8B3A6280`)  |
| `borderWidth` | number  | 0          | Border stroke width                             |
| `borderColor` | string  | `#ffffff`  | Border stroke color                             |
| `visible`     | boolean | true       | Show/hide the center hub                        |
| `fontFamily`  | string  |            | Font family for the hub label (overrides `style.fontFamily`) |

### Scale (`scale`)

| Property | Type   | Default | Description                  |
| -------- | ------ | ------- | ---------------------------- |
| `min`    | number | 1       | Minimum score value          |
| `max`    | number | 5       | Maximum score value          |
| `rings`  | number | 5       | Number of concentric rings   |

### Segments (`segments[]`)

| Property     | Type   | Description                                                                          |
| ------------ | ------ | ------------------------------------------------------------------------------------ |
| `name`       | string | Segment label (displayed on outer ring)                                              |
| `color`      | string | Segment fill color                                                                   |
| `labelColor` | string | Optional. Override fill for the dimension label band. Falls back to `color` if unset. |
| `facets`     | array  | Facets within this segment                                                           |
| `subLabel`   | string | Optional. Secondary curved line rendered directly below the section name on the coloured band (same curve, smaller radius, regular weight). Printed verbatim, e.g. a section average `"3.7"` or a percentage `"74%"`. Only drawn when set. |

### Facets (`segments[].facets[]`)

| Property      | Type   | Description                             |
| ------------- | ------ | --------------------------------------- |
| `name`        | string | Facet label                             |
| `score`       | number | Score value (within scale min-max range)|
| `description` | string | Optional description for tooltips       |
| `figure`      | string | Optional. Figure text (raw score or percentage) drawn in a ring just outside the centre hub at the facet's mid-angle, with no background. Printed verbatim. Only drawn when set. See the `facetFigure*` style options. |

### Style Options (`style`)

#### Rings

| Property    | Type    | Default    | Description                            |
| ----------- | ------- | ---------- | -------------------------------------- |
| `showRings` | boolean | true       | Show concentric ring circles           |
| `ringColor` | string  | `#cccccc`  | Ring circle color                      |
| `ringWidth` | number  | 1          | Ring stroke width                      |
| `ringStyle` | string  | `dashed`   | Ring style: `solid` or `dashed`        |

#### Score Labels

| Property                | Type    | Default    | Description                  |
| ----------------------- | ------- | ---------- | ---------------------------- |
| `showScoreLabels`       | boolean | false      | Show score level labels (1-5)|
| `scoreLabelFontSize`    | number  | 14         | Score label font size        |
| `scoreLabelColor`       | string  | `#ffffff`  | Score label fill color       |
| `scoreLabelStrokeColor` | string  | `#333333`  | Score label outline color    |

#### Facet Points

| Property          | Type    | Default  | Description                               |
| ----------------- | ------- | -------- | ----------------------------------------- |
| `showFacetPoints` | boolean | true     | Show facet indicator points               |
| `facetPointStyle` | string  | `circle` | Point style: `circle`, `dot`, or `none`   |

#### Facets

| Property       | Type   | Default | Description                       |
| -------------- | ------ | ------- | --------------------------------- |
| `facetOpacity` | number | 1       | Opacity of score fill areas (0-1) |
| `trackOpacity` | number | 0.3     | Opacity of the unscored segment background track (0-1) |
| `facetFontSize`| number | 11      | Facet label font size             |

#### Segment Dividers

| Property              | Type    | Default   | Description                |
| --------------------- | ------- | --------- | -------------------------- |
| `showSegmentDividers` | boolean | true      | Show segment divider lines |
| `segmentDividerWidth` | number  | 2         | Divider line width         |
| `segmentDividerColor` | string  | `#ffffff` | Divider line color         |

#### Hub Text

| Property       | Type   | Default   | Description                  |
| -------------- | ------ | --------- | ---------------------------- |
| `hubFontSize`  | number | 14        | Center hub label font size   |
| `hubFontColor` | string | `#ffffff` | Center hub label color       |

#### Segment Labels

| Property                | Type   | Default   | Description                                                          |
| ----------------------- | ------ | --------- | -------------------------------------------------------------------- |
| `segmentFontSize`       | number | 28        | Segment label font size                                              |
| `segmentLabelPosition`  | string | `outer`   | Where the labelled colour band sits: `outer` (around the wheel) or `inner` (around the centre hub). See [Multi-line labels and label position](#multi-line-labels-and-label-position). |

#### Flow arrows

| Property          | Type    | Default | Description                                                                  |
| ----------------- | ------- | ------- | ---------------------------------------------------------------------------- |
| `flowDirection`   | string  |         | `clockwise` or `counterclockwise` to draw arrows on each segment boundary indicating flow. Unset = no arrows. |
| `flowCloseLoop`   | boolean | false   | Also draw the wrap-around arrow (last segment → first).                      |
| `flowArrowColor`  | string  |         | Fill colour for the arrows. Falls back to `segmentDividerColor`.             |
| `flowArrowSize`   | number  | 14      | Length of each arrow in pixels.                                              |

#### General

| Property          | Type   | Default             | Description                              |
| ----------------- | ------ | ------------------- | ---------------------------------------- |
| `fontFamily`      | string | `Arial, sans-serif` | Font family for all labels               |
| `backgroundColor` | string |                     | Background color (transparent if not set)|

#### Wheel redesign options (2b)

These are all opt-in. When none are set (and no `segment.subLabel` / `facet.figure`
is supplied), output is byte-identical to previous versions.

##### Section sub-label (below the curved section name)

| Property                    | Type   | Default   | Description                                                                 |
| --------------------------- | ------ | --------- | --------------------------------------------------------------------------- |
| `segmentSubLabelColor`      | string | `#ffffff` | Fill colour for the sub-label (`segment.subLabel`)                          |
| `segmentSubLabelFontScale`  | number | 0.62      | Sub-label font size as a fraction of the auto-scaled section-name font size |

##### Outer-edge facet labels

Enabled with `facetLabelPlacement: 'outer-edge'`. The other options only take
effect in that mode; their in-mode defaults are shown.

| Property                   | Type            | Default (in mode) | Description                                                                                             |
| -------------------------- | --------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `facetLabelPlacement`      | string          | `default`         | `default` = original italic labels; `outer-edge` = radial labels along the outer petal edge, upright    |
| `facetLabelUppercase`      | boolean         | true              | Uppercase the label text                                                                                 |
| `facetLabelWeight`         | number\|string  | 700               | Font weight                                                                                              |
| `facetLabelLetterSpacing`  | string          | `0.04em`          | CSS letter-spacing                                                                                       |
| `facetLabelWrap`           | boolean         | true              | Auto-wrap multi-word labels onto two balanced lines, keeping a trailing `&` with the word before it. An explicit `\n` always wins. |

In `outer-edge` mode the label colour comes from `facetFontColor` (defaulting to
`#555555` when unset) and the size from `facetFontSize`.

##### Per-facet figure ring

Drawn for every `facet.figure` that is set (no circle, ring, or background).

| Property              | Type    | Default              | Description                                                                          |
| --------------------- | ------- | -------------------- | ------------------------------------------------------------------------------------ |
| `facetFigureFontSize` | number  | 12                   | Figure font size                                                                     |
| `facetFigureColor`    | string  | `#555555`            | Figure fill colour                                                                   |
| `facetFigureGap`      | number  | = `facetFigureFontSize` | Radial gap from the hub edge to the figure ring (`center.radius + facetFigureGap`) |
| `facetFigureRotate`   | boolean | false                | Rotate figures to follow the spoke direction (upright-flipped on the bottom/left half) |

##### Facet gaps and dividers

| Property             | Type              | Default                | Description                                                                                              |
| -------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `facetPadding`       | number \| `'auto'` | (off)                  | Angular inset per side for each facet's fill and track, so white gaps appear between sub-segments. `'auto'` = `min(0.9, facetStepDegrees * 0.06)`. When set, the track is drawn per facet. |
| `showFacetDividers`  | boolean           | (unset = faint legacy) | `true` draws configurable radial separators at each internal facet boundary; `false` hides them; unset keeps the original faint separators |
| `facetDividerColor`  | string            | `rgba(255,255,255,0.7)`| Separator colour when `showFacetDividers` is true                                                        |
| `facetDividerWidth`  | number            | 1.4                    | Separator width when `showFacetDividers` is true                                                         |

##### Section-name and hub typography

| Property               | Type    | Default          | Description                                                          |
| ---------------------- | ------- | ---------------- | ------------------------------------------------------------------- |
| `segmentFontFamily`    | string  | = `fontFamily`   | Font family for the curved section names                             |
| `segmentLetterSpacing` | string  | (none)           | CSS letter-spacing for the curved section names (e.g. `0.02em`)      |
| `segmentUppercase`     | boolean | false            | Uppercase the curved section names                                   |
| `center.fontFamily`    | string  | = `fontFamily`   | Font family for the centre hub label (set on the `center` object)   |

This lets a caller give the section names and hub one face (e.g. a display font)
while the facet labels, figures, and sub-labels keep the body `fontFamily`.

To hide the 1-5 scale axis numbers on the top spine, set `showScoreLabels: false`.

## Multi-line labels and label position

### Line breaks with `\n`

`\n` produces a line break in:

- `center.label` — centre hub text stacks vertically.
- `segment.name` — dimension/segment labels stack along the radius of the
  label band, each line on its own curved arc. The band grows by one
  line-height for each extra line.
- `facet.name` — facet labels stack as `<tspan>` rows under the existing
  rotation.

Segment arc text on a single line stays curved; multi-line dimension labels
keep the curve on each individual line.

### Inner vs outer label position

`style.segmentLabelPosition` decides where the labelled colour band sits:

- `outer` (default) — the band sits outside the wheel. Best for assessment
  diagrams where the wedge area shows scoring.
- `inner` — the band sits between the centre hub and the facet area, with ring
  dividers on both edges. Best for framework-style diagrams where the
  dimensions wrap the centre hub. Note that the inner band visually overlays
  the inner part of the wedge, so partial score fills (low scores) may be
  hidden behind it.

## Upgrading from 1.x

The centre hub no longer splits its label on `&`. Previously
`"PMO Maturity & Evolution"` would render as two lines (`"PMO Maturity"` /
`"& Evolution"`); now it renders as a single line.

To preserve the old two-line layout, replace `& ` with `\n& ` in the centre
label (and in any segment or facet name where you want a break):

```diff
- "label": "PMO Maturity & Evolution"
+ "label": "PMO Maturity\n& Evolution"
```

All bundled demo configs are already migrated.

## Example Configuration

```json
{
  "size": 800,
  "startAngle": -90,
  "center": {
    "label": "Core",
    "radius": 100,
    "color": "#8B3A62",
    "borderWidth": 8,
    "borderColor": "#ffffff",
    "visible": true
  },
  "scale": {
    "min": 1,
    "max": 5,
    "rings": 5
  },
  "segments": [
    {
      "name": "Segment 1",
      "color": "#E6A817",
      "facets": [
        { "name": "Section 1", "score": 3 },
        { "name": "Section 2", "score": 4 }
      ]
    }
  ],
  "style": {
    "fontFamily": "Verdana, sans-serif",
    "showRings": true,
    "ringStyle": "dashed",
    "showScoreLabels": true,
    "facetOpacity": 0.8,
    "segmentDividerWidth": 8
  }
}
```

## Programmatic Usage

### TypeScript/ESM

```typescript
import { SVGRenderer, type DiagramConfig } from 'radial-diagram';

const config: DiagramConfig = {
  size: 800,
  startAngle: -90,  // Start at top

  center: {
    label: "Core",
    radius: 60,
    color: "#8B3A62"
  },

  scale: {
    min: 1,
    max: 5,
    rings: 5
  },

  segments: [
    {
      name: "Strategy",
      color: "#3b82f6",
      facets: [
        { name: "Vision", score: 4.2 },
        { name: "Planning", score: 3.8 }
      ]
    },
    {
      name: "Technology",
      color: "#10b981",
      facets: [
        { name: "Infrastructure", score: 4.5 },
        { name: "Security", score: 3.9 }
      ]
    }
  ],

  style: {
    backgroundColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    showRings: true
  }
};

// Create renderer and generate SVG
const renderer = new SVGRenderer(config);
const svg = renderer.render(); // Returns SVG string
```

### Using Helper Functions

```typescript
import { createConfig, renderDiagram, validateConfig } from 'radial-diagram';

// Create config with defaults
const config = createConfig({
  size: 800,
  segments: [
    {
      name: "Strategy",
      color: "#3b82f6",
      facets: [{ name: "Vision", score: 4.2 }]
    }
  ]
});

// Validate configuration
const validation = validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// Render directly
const svg = renderDiagram(config);
```

### Available Exports

```typescript
// Classes
import { SVGRenderer } from 'radial-diagram';

// Types (use with 'type' keyword)
import type {
  DiagramConfig,
  Segment,
  Facet,
  CenterConfig,
  ScaleConfig,
  StyleConfig,
  ValidationResult
} from 'radial-diagram';

// Helper functions
import {
  createConfig,      // Create config with defaults
  validateConfig,    // Validate configuration
  renderDiagram,     // Convenience function to render
  DEFAULT_STYLE,     // Default style configuration
  DEFAULT_SCALE      // Default scale configuration
} from 'radial-diagram';

// Geometry utilities (advanced usage)
import {
  polarToCartesian,
  segmentPath,
  facetAngles,
  scoreToRadius,
  ringRadii,
  segmentAngle
} from 'radial-diagram';
```

## License

MIT

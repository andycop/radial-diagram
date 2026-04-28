# Usage Example

This document shows how to properly use the radial-diagram package.

## Installation

```bash
npm install radial-diagram
```

## Basic Usage

```typescript
import { SVGRenderer, type DiagramConfig } from 'radial-diagram';

// Create a diagram configuration
const config: DiagramConfig = {
  size: 800,
  startAngle: -90,  // Start at top (-90 degrees)

  // Center hub configuration
  center: {
    label: "Core",
    radius: 60,
    color: "#8B3A62"
  },

  // Score scale configuration
  scale: {
    min: 1,
    max: 5,
    rings: 5  // Number of concentric rings
  },

  // Outer segments with facets
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

  // Optional style configuration
  style: {
    backgroundColor: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    showRings: true,
    ringColor: '#cccccc',
    ringStyle: 'dashed'
  }
};

// Create renderer and generate SVG
const renderer = new SVGRenderer(config);
const svgString = renderer.render();

// Use the SVG string (e.g., write to file, send to client, etc.)
console.log(svgString);
```

## Using the Helper Function

You can also use the convenience function `renderDiagram`:

```typescript
import { renderDiagram, type DiagramConfig } from 'radial-diagram';

const config: DiagramConfig = {
  // ... same config as above
};

const svgString = renderDiagram(config);
```

## Using with Partial Configuration

You can use `createConfig` to fill in defaults:

```typescript
import { createConfig, SVGRenderer } from 'radial-diagram';

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

const renderer = new SVGRenderer(config);
const svg = renderer.render();
```

## Validating Configuration

```typescript
import { validateConfig, type DiagramConfig } from 'radial-diagram';

const config: DiagramConfig = {
  // ... your config
};

const validation = validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
} else {
  console.log('Configuration is valid!');
}
```

## Multi-line labels and inner label band

`\n` produces line breaks in `center.label`, segment names and facet names.
Combine with `style.segmentLabelPosition: 'inner'` for framework-style
diagrams where dimensions wrap the centre hub:

```typescript
import { SVGRenderer, type DiagramConfig } from 'radial-diagram';

const config: DiagramConfig = {
  size: 900,
  startAngle: -90,
  center: {
    label: "Capability\nFramework",   // \n stacks the hub label
    radius: 110,
    color: "#2D2D2D"
  },
  scale: { min: 1, max: 5, rings: 5 },
  segments: [
    {
      name: "Strategy\n& Roadmap",     // \n stacks the dimension label
      color: "#5E35B1",
      facets: [
        { name: "Planning\nhorizon", score: 4 },   // \n stacks the facet label
        { name: "Vision",            score: 3 }
      ]
    },
    {
      name: "Delivery",
      color: "#43A047",
      facets: [
        { name: "Cadence", score: 3 },
        { name: "Quality\n& assurance", score: 4 }
      ]
    }
  ],
  style: {
    backgroundColor: "#1a1a1a",
    segmentLabelPosition: "inner",   // band sits around the centre hub
    showSegmentDividers: true,
    segmentDividerColor: "#1a1a1a"
  }
};

const svg = new SVGRenderer(config).render();
```

The dimension band auto-sizes to the largest line count across all segment
names, so single-line dimensions sit centred in a slightly thicker band.

## Upgrading from 1.x

The centre hub no longer splits its `label` on `&` — `&` now renders as a
literal character. Replace any `& ` line breaks with `\n& `:

```diff
- center: { label: "PMO Maturity & Evolution" }
+ center: { label: "PMO Maturity\n& Evolution" }
```

## Type Definitions

All TypeScript types are exported:

```typescript
import type {
  DiagramConfig,
  Segment,
  Facet,
  CenterConfig,
  ScaleConfig,
  StyleConfig,
  ValidationResult
} from 'radial-diagram';
```

## API Reference

### DiagramConfig

- `size: number` - Total diagram size in pixels (width = height)
- `startAngle: number` - Starting angle offset in degrees (-90 = top, 0 = right)
- `center: CenterConfig` - Center hub configuration
- `scale: ScaleConfig` - Score scale configuration
- `segments: Segment[]` - Array of outer segments
- `style: StyleConfig` - Visual style options

### CenterConfig

- `label: string` - Label text for center hub
- `radius: number` - Radius of center hub in pixels
- `color: string` - Fill color for center hub
- `subtitle?: string` - Optional secondary line of text
- `borderWidth?: number` - Border/stroke width (0 for no border)
- `borderColor?: string` - Border/stroke color
- `visible?: boolean` - Set to false to hide the center hub entirely
- `fontSize?: number` - Font size for center hub label
- `fontColor?: string` - Font color for center hub label

### ScaleConfig

- `min: number` - Minimum score value
- `max: number` - Maximum score value
- `rings: number` - Number of concentric rings to display
- `ringLabels?: string[]` - Optional labels for each ring level

### Segment

- `name: string` - Display name for the segment
- `color: string` - Segment fill color (hex or CSS color)
- `facets: Facet[]` - Facets within this segment

### Facet

- `name: string` - Display name for this facet
- `score?: number` - Score value (within scale min-max range)
- `description?: string` - Optional description for tooltips

### StyleConfig

All style properties are optional. See the TypeScript definitions for the complete list of available style options.

## Notes

- The center of the diagram is always positioned at `size/2, size/2`
- You don't need to specify center x,y coordinates - they're calculated automatically
- Scores must be within the scale's min-max range
- The SVGRenderer validates the configuration before rendering and throws an error if invalid

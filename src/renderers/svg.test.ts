import { describe, it, expect } from 'vitest';
import { SVGRenderer, renderDiagram } from './svg.js';
import { DEFAULT_STYLE, DEFAULT_SCALE, DiagramConfig } from '../core/types.js';

const validConfig: DiagramConfig = {
  size: 800,
  startAngle: -90,
  center: {
    label: 'Test Hub',
    radius: 100,
    color: '#702082',
  },
  scale: { ...DEFAULT_SCALE },
  segments: [
    {
      name: 'Segment One',
      color: '#E6A817',
      facets: [
        { name: 'Facet A', score: 3 },
        { name: 'Facet B', score: 4 },
      ],
    },
    {
      name: 'Segment Two',
      color: '#C41E3A',
      facets: [{ name: 'Facet C', score: 2 }],
    },
  ],
  style: { ...DEFAULT_STYLE },
};

describe('SVGRenderer', () => {
  it('creates renderer with valid config', () => {
    const renderer = new SVGRenderer(validConfig);
    expect(renderer).toBeInstanceOf(SVGRenderer);
  });

  it('throws on invalid config', () => {
    const invalidConfig = { ...validConfig, size: 0 };
    expect(() => new SVGRenderer(invalidConfig)).toThrow('Invalid diagram configuration');
  });

  it('renders valid SVG', () => {
    const renderer = new SVGRenderer(validConfig);
    const svg = renderer.render();
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('includes segment labels', () => {
    const renderer = new SVGRenderer(validConfig);
    const svg = renderer.render();
    expect(svg).toContain('Segment One');
    expect(svg).toContain('Segment Two');
  });

  it('includes facet labels', () => {
    const renderer = new SVGRenderer(validConfig);
    const svg = renderer.render();
    expect(svg).toContain('Facet A');
    expect(svg).toContain('Facet B');
    expect(svg).toContain('Facet C');
  });

  it('includes center hub label', () => {
    const renderer = new SVGRenderer(validConfig);
    const svg = renderer.render();
    expect(svg).toContain('Test Hub');
  });

  it('escapes ampersands in labels', () => {
    const config = {
      ...validConfig,
      center: { ...validConfig.center, label: 'Test & Hub' },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).toContain('&amp;');
    expect(svg).not.toMatch(/Test & Hub/); // Should be escaped
  });

  it('hides center hub when visible is false', () => {
    const config = {
      ...validConfig,
      center: { ...validConfig.center, visible: false },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).not.toContain('class="center-hub"');
  });

  it('renders background when specified', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, backgroundColor: '#f0f0f0' },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).toContain('fill="#f0f0f0"');
  });

  it('hides rings when showRings is false', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, showRings: false },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).not.toContain('class="rings"');
  });

  it('shows score labels when enabled', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, showScoreLabels: true },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).toContain('class="score-labels"');
  });

  it('hides segment dividers when disabled', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, showSegmentDividers: false },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).not.toContain('class="segment-dividers"');
  });

  it('handles facets without scores', () => {
    const config = {
      ...validConfig,
      segments: [
        {
          name: 'Seg',
          color: '#000',
          facets: [{ name: 'No Score Facet' }],
        },
      ],
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).toContain('No Score Facet');
  });

  it('applies center border when specified', () => {
    const config = {
      ...validConfig,
      center: {
        ...validConfig.center,
        borderWidth: 4,
        borderColor: '#ffffff',
      },
    };
    const renderer = new SVGRenderer(config);
    const svg = renderer.render();
    expect(svg).toContain('stroke="#ffffff"');
    expect(svg).toContain('stroke-width="4"');
  });
});

describe('wheel-redesign options (2b)', () => {
  it('keeps the unscored track opacity at 0.3 by default', () => {
    const svg = new SVGRenderer(validConfig).render();
    expect(svg).toContain('opacity="0.3"');
  });

  it('applies a configurable track opacity', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, trackOpacity: 0.12 },
    };
    const svg = new SVGRenderer(config).render();
    expect(svg).toContain('opacity="0.12"');
  });

  it('renders a curved section sub-label when segment.subLabel is set', () => {
    const config = {
      ...validConfig,
      segments: validConfig.segments.map((s, i) => ({ ...s, subLabel: `${i}9%` })),
    };
    const svg = new SVGRenderer(config).render();
    expect(svg).toContain('>09%</textPath>');
    expect(svg).toContain('font-weight: normal');
  });

  it('does not add a facet-figures layer when no facet has a figure', () => {
    const svg = new SVGRenderer(validConfig).render();
    expect(svg).not.toContain('class="facet-figures"');
  });

  it('renders per-facet figures with no background when facet.figure is set', () => {
    const config = {
      ...validConfig,
      segments: [
        {
          name: 'Seg',
          color: '#702082',
          facets: [{ name: 'A', score: 3, figure: '74%' }],
        },
      ],
    };
    const svg = new SVGRenderer(config).render();
    expect(svg).toContain('class="facet-figures"');
    expect(svg).toContain('>74%</text>');
  });

  it('uppercases and wraps outer-edge facet labels keeping a trailing &', () => {
    const config = {
      ...validConfig,
      style: { ...DEFAULT_STYLE, facetLabelPlacement: 'outer-edge' as const },
      segments: [
        {
          name: 'Seg',
          color: '#702082',
          facets: [{ name: 'Direction & Purpose', score: 3 }],
        },
      ],
    };
    const svg = new SVGRenderer(config).render();
    expect(svg).toContain('DIRECTION &amp;</tspan>');
    expect(svg).toContain('PURPOSE</tspan>');
  });
});

describe('renderDiagram', () => {
  it('is a convenience function that returns SVG', () => {
    const svg = renderDiagram(validConfig);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('throws on invalid config', () => {
    const invalidConfig = { ...validConfig, size: -1 };
    expect(() => renderDiagram(invalidConfig)).toThrow();
  });
});

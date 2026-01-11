import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  createConfig,
  DEFAULT_STYLE,
  DEFAULT_SCALE,
  DiagramConfig,
} from './types.js';

const validConfig: DiagramConfig = {
  size: 800,
  startAngle: -90,
  center: {
    label: 'Test',
    radius: 100,
    color: '#333333',
  },
  scale: {
    min: 1,
    max: 5,
    rings: 5,
  },
  segments: [
    {
      name: 'Segment 1',
      color: '#ff0000',
      facets: [{ name: 'Facet 1', score: 3 }],
    },
  ],
  style: { ...DEFAULT_STYLE },
};

describe('validateConfig', () => {
  it('accepts valid configuration', () => {
    const result = validateConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects zero size', () => {
    const config = { ...validConfig, size: 0 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('size must be greater than 0');
  });

  it('rejects negative size', () => {
    const config = { ...validConfig, size: -100 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects missing center', () => {
    const config = { ...validConfig, center: undefined as any };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('center configuration is required');
  });

  it('rejects zero center radius', () => {
    const config = {
      ...validConfig,
      center: { ...validConfig.center, radius: 0 },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('center.radius must be greater than 0');
  });

  it('rejects missing scale', () => {
    const config = { ...validConfig, scale: undefined as any };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('scale configuration is required');
  });

  it('rejects scale.min > scale.max', () => {
    const config = {
      ...validConfig,
      scale: { min: 5, max: 1, rings: 5 },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('scale.min must be less than or equal to scale.max');
  });

  it('rejects zero rings', () => {
    const config = {
      ...validConfig,
      scale: { min: 1, max: 5, rings: 0 },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('scale.rings must be greater than 0');
  });

  it('rejects empty segments array', () => {
    const config = { ...validConfig, segments: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('segments array must contain at least one segment');
  });

  it('rejects segment with empty facets', () => {
    const config = {
      ...validConfig,
      segments: [{ name: 'Empty', color: '#000', facets: [] }],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must contain at least one facet');
  });

  it('rejects facet score outside scale range', () => {
    const config = {
      ...validConfig,
      segments: [
        {
          name: 'Seg',
          color: '#000',
          facets: [{ name: 'Facet', score: 10 }], // max is 5
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be between');
  });

  it('allows facet without score (undefined)', () => {
    const config = {
      ...validConfig,
      segments: [
        {
          name: 'Seg',
          color: '#000',
          facets: [{ name: 'Facet' }], // No score
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('rejects center radius >= outer radius', () => {
    const config = {
      ...validConfig,
      size: 200,
      center: { ...validConfig.center, radius: 100 }, // outer = 90 (200/2 * 0.9)
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('center.radius');
  });
});

describe('createConfig', () => {
  it('fills in default values', () => {
    const config = createConfig({});
    expect(config.size).toBe(800);
    expect(config.startAngle).toBe(-90);
    expect(config.center.label).toBe('Core');
    expect(config.scale).toEqual({ ...DEFAULT_SCALE });
    expect(config.style).toEqual({ ...DEFAULT_STYLE });
  });

  it('preserves provided values', () => {
    const config = createConfig({
      size: 600,
      startAngle: 0,
      center: { label: 'Custom', radius: 80, color: '#123456' },
    });
    expect(config.size).toBe(600);
    expect(config.startAngle).toBe(0);
    expect(config.center.label).toBe('Custom');
    expect(config.center.radius).toBe(80);
  });

  it('merges partial style with defaults', () => {
    const config = createConfig({
      style: { facetOpacity: 0.5 },
    });
    expect(config.style.facetOpacity).toBe(0.5);
    expect(config.style.fontFamily).toBe(DEFAULT_STYLE.fontFamily);
  });
});

describe('DEFAULT_STYLE', () => {
  it('has all expected properties defined', () => {
    expect(DEFAULT_STYLE.showRings).toBe(true);
    expect(DEFAULT_STYLE.ringColor).toBe('#cccccc');
    expect(DEFAULT_STYLE.fontFamily).toBe('Arial, sans-serif');
    expect(DEFAULT_STYLE.facetOpacity).toBe(1);
  });
});

describe('DEFAULT_SCALE', () => {
  it('has 1-5 range with 5 rings', () => {
    expect(DEFAULT_SCALE.min).toBe(1);
    expect(DEFAULT_SCALE.max).toBe(5);
    expect(DEFAULT_SCALE.rings).toBe(5);
  });
});

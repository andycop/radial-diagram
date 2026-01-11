import { describe, it, expect } from 'vitest';
import {
  polarToCartesian,
  describeArc,
  segmentPath,
  segmentAngle,
  facetAngles,
  scoreToRadius,
  ringRadii,
  labelOrientation,
} from './geometry.js';

describe('polarToCartesian', () => {
  it('converts 0 degrees (right) correctly', () => {
    const point = polarToCartesian(100, 100, 50, 0);
    expect(point.x).toBeCloseTo(150);
    expect(point.y).toBeCloseTo(100);
  });

  it('converts 90 degrees (down in SVG) correctly', () => {
    const point = polarToCartesian(100, 100, 50, 90);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(150);
  });

  it('converts 180 degrees (left) correctly', () => {
    const point = polarToCartesian(100, 100, 50, 180);
    expect(point.x).toBeCloseTo(50);
    expect(point.y).toBeCloseTo(100);
  });

  it('converts -90 degrees (up) correctly', () => {
    const point = polarToCartesian(100, 100, 50, -90);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(50);
  });
});

describe('segmentAngle', () => {
  it('calculates angle for 4 segments', () => {
    expect(segmentAngle(4)).toBe(90);
  });

  it('calculates angle for 6 segments', () => {
    expect(segmentAngle(6)).toBe(60);
  });

  it('throws on zero segments', () => {
    expect(() => segmentAngle(0)).toThrow('segmentCount must be greater than 0');
  });

  it('throws on negative segments', () => {
    expect(() => segmentAngle(-1)).toThrow('segmentCount must be greater than 0');
  });
});

describe('facetAngles', () => {
  it('calculates angles for 3 facets in a 90-degree segment', () => {
    const angles = facetAngles(0, 90, 3);
    expect(angles).toHaveLength(3);
    expect(angles[0].startAngle).toBe(0);
    expect(angles[0].endAngle).toBe(30);
    expect(angles[0].midAngle).toBe(15);
    expect(angles[2].endAngle).toBe(90);
  });

  it('throws on zero facets', () => {
    expect(() => facetAngles(0, 90, 0)).toThrow('facetCount must be greater than 0');
  });
});

describe('scoreToRadius', () => {
  it('maps minimum score to near inner radius', () => {
    const radius = scoreToRadius(1, 1, 5, 50, 150);
    // Score 1 on 1-5 scale = 1/5 of range
    expect(radius).toBeCloseTo(70); // 50 + (1/5 * 100)
  });

  it('maps maximum score to outer radius', () => {
    const radius = scoreToRadius(5, 1, 5, 50, 150);
    // Score 5 on 1-5 scale = 5/5 of range
    expect(radius).toBeCloseTo(150);
  });

  it('clamps scores below minimum', () => {
    const radius = scoreToRadius(0, 1, 5, 50, 150);
    expect(radius).toBeCloseTo(70); // Same as score 1
  });

  it('clamps scores above maximum', () => {
    const radius = scoreToRadius(10, 1, 5, 50, 150);
    expect(radius).toBeCloseTo(150); // Same as score 5
  });

  it('handles equal min and max (flat scale)', () => {
    const radius = scoreToRadius(3, 3, 3, 50, 150);
    expect(radius).toBe(150); // Returns outer radius
  });

  it('throws on invalid scale (min > max)', () => {
    expect(() => scoreToRadius(3, 5, 1, 50, 150)).toThrow('minScore must be less than or equal to maxScore');
  });

  it('throws on invalid radii', () => {
    expect(() => scoreToRadius(3, 1, 5, 150, 50)).toThrow('innerRadius must be less than outerRadius');
  });
});

describe('ringRadii', () => {
  it('calculates 5 rings correctly', () => {
    const radii = ringRadii(5, 50, 150);
    expect(radii).toHaveLength(6); // 5 rings + 1 for outer boundary
    expect(radii[0]).toBe(50);
    expect(radii[5]).toBe(150);
    expect(radii[1]).toBeCloseTo(70);
  });

  it('throws on zero rings', () => {
    expect(() => ringRadii(0, 50, 150)).toThrow('ringCount must be greater than 0');
  });

  it('throws on invalid radii', () => {
    expect(() => ringRadii(5, 150, 50)).toThrow('innerRadius must be less than outerRadius');
  });
});

describe('describeArc', () => {
  it('generates valid SVG arc path', () => {
    const path = describeArc(100, 100, 50, 0, 90);
    expect(path).toContain('M');
    expect(path).toContain('A');
  });
});

describe('segmentPath', () => {
  it('generates pie slice when inner radius is 0', () => {
    const path = segmentPath(100, 100, 0, 50, 0, 90);
    expect(path).toContain('M 100 100'); // Starts at center
    expect(path).toContain('Z'); // Closed path
  });

  it('generates ring segment when inner radius > 0', () => {
    const path = segmentPath(100, 100, 30, 50, 0, 90);
    expect(path).not.toContain('M 100 100'); // Does not go through center
    expect(path).toContain('Z'); // Closed path
  });
});

describe('labelOrientation', () => {
  it('handles right side (0 degrees)', () => {
    const orient = labelOrientation(0);
    expect(orient.textAnchor).toBeDefined();
    expect(typeof orient.rotation).toBe('number');
  });

  it('normalizes angles greater than 360', () => {
    const orient1 = labelOrientation(45);
    const orient2 = labelOrientation(405); // 45 + 360
    expect(orient1.rotation % 360).toBeCloseTo(orient2.rotation % 360);
  });

  it('normalizes negative angles', () => {
    const orient = labelOrientation(-90);
    expect(orient.textAnchor).toBeDefined();
  });
});

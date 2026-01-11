/**
 * Geometry utilities for circular diagram calculations
 *
 * @license MIT
 * @copyright 2026 CGA Management Ltd
 * @see https://www.cgamanagement.co.uk/category/tools
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert polar coordinates to Cartesian (SVG) coordinates
 * @param cx Center X
 * @param cy Center Y
 * @param radius Distance from center
 * @param angleDegrees Angle in degrees (0 = right, 90 = down in SVG coords)
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number
): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

/**
 * Generate SVG arc path data
 * @param cx Center X
 * @param cy Center Y
 * @param radius Arc radius
 * @param startAngle Start angle in degrees
 * @param endAngle End angle in degrees
 * @returns SVG path d attribute for the arc
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  // Determine if arc should be drawn the "long way" around
  const angleDiff = endAngle - startAngle;
  const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;

  // Sweep direction (1 = clockwise in SVG)
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

/**
 * Generate SVG path for a filled segment (pie slice or ring segment)
 * @param cx Center X
 * @param cy Center Y
 * @param innerRadius Inner radius (0 for full pie slice)
 * @param outerRadius Outer radius
 * @param startAngle Start angle in degrees
 * @param endAngle End angle in degrees
 * @returns SVG path d attribute for the filled segment
 */
export function segmentPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);

  const angleDiff = endAngle - startAngle;
  const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;

  if (innerRadius === 0) {
    // Full pie slice from center
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ');
  }

  // Ring segment (donut slice)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/**
 * Generate SVG path for a filled arc segment within a facet
 * Used for showing scores as filled arcs
 * @param cx Center X
 * @param cy Center Y
 * @param innerRadius Inner radius (center hub edge)
 * @param outerRadius Outer radius (based on score)
 * @param startAngle Start angle of facet
 * @param endAngle End angle of facet
 */
export function facetScorePath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  return segmentPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
}

/**
 * Calculate the angle span for each segment
 * @param segmentCount Number of segments (must be > 0)
 * @returns Angle in degrees per segment
 * @throws Error if segmentCount is not greater than 0
 */
export function segmentAngle(segmentCount: number): number {
  if (segmentCount <= 0) {
    throw new Error('segmentCount must be greater than 0');
  }
  return 360 / segmentCount;
}

/**
 * Calculate angles for facets within a segment
 * @param segmentStartAngle Start angle of the segment
 * @param segmentEndAngle End angle of the segment
 * @param facetCount Number of facets in segment (must be > 0)
 * @returns Array of { startAngle, endAngle, midAngle } for each facet
 * @throws Error if facetCount is not greater than 0
 */
export function facetAngles(
  segmentStartAngle: number,
  segmentEndAngle: number,
  facetCount: number
): Array<{ startAngle: number; endAngle: number; midAngle: number }> {
  if (facetCount <= 0) {
    throw new Error('facetCount must be greater than 0');
  }
  const totalAngle = segmentEndAngle - segmentStartAngle;
  const facetAngleSpan = totalAngle / facetCount;

  return Array.from({ length: facetCount }, (_, i) => {
    const startAngle = segmentStartAngle + i * facetAngleSpan;
    const endAngle = startAngle + facetAngleSpan;
    const midAngle = (startAngle + endAngle) / 2;
    return { startAngle, endAngle, midAngle };
  });
}

/**
 * Calculate radius for a given score level
 * Uses level-based calculation where score 1 = 1/5, score 5 = 5/5 (for 1-5 scale)
 * @param score The score value (will be clamped to valid range)
 * @param minScore Minimum score in scale
 * @param maxScore Maximum score in scale
 * @param innerRadius Radius of center hub
 * @param outerRadius Maximum outer radius
 * @throws Error if minScore > maxScore or innerRadius >= outerRadius
 */
export function scoreToRadius(
  score: number,
  minScore: number,
  maxScore: number,
  innerRadius: number,
  outerRadius: number
): number {
  if (minScore > maxScore) {
    throw new Error('minScore must be less than or equal to maxScore');
  }
  if (innerRadius >= outerRadius) {
    throw new Error('innerRadius must be less than outerRadius');
  }
  // When min === max, return full outer radius (flat diagram)
  if (minScore === maxScore) {
    return outerRadius;
  }
  // Clamp score to valid range
  const clampedScore = Math.max(minScore, Math.min(maxScore, score));
  const levels = maxScore - minScore + 1; // 5 levels for 1-5 scale
  const radiusRange = outerRadius - innerRadius;
  const normalizedScore = (clampedScore - minScore + 1) / levels;
  return innerRadius + normalizedScore * radiusRange;
}

/**
 * Calculate radii for ring grid lines
 * @param ringCount Number of rings (must be > 0)
 * @param innerRadius Inner radius (center hub)
 * @param outerRadius Outer radius
 * @throws Error if ringCount is not greater than 0 or innerRadius >= outerRadius
 */
export function ringRadii(
  ringCount: number,
  innerRadius: number,
  outerRadius: number
): number[] {
  if (ringCount <= 0) {
    throw new Error('ringCount must be greater than 0');
  }
  if (innerRadius >= outerRadius) {
    throw new Error('innerRadius must be less than outerRadius');
  }
  const step = (outerRadius - innerRadius) / ringCount;
  return Array.from({ length: ringCount + 1 }, (_, i) => innerRadius + i * step);
}

/**
 * Calculate text anchor and rotation for labels at an angle
 * @param angle Angle in degrees
 * @returns Object with textAnchor and rotation for readable text
 */
export function labelOrientation(angle: number): {
  textAnchor: 'start' | 'middle' | 'end';
  rotation: number;
  alignmentBaseline: string;
} {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;

  // Text should be readable (not upside down)
  // Right side (315-45): start anchor
  // Bottom (45-135): middle anchor
  // Left side (135-225): end anchor
  // Top (225-315): middle anchor

  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  let rotation = normalizedAngle + 90; // Tangent to circle
  let alignmentBaseline = 'middle';

  // Flip text that would be upside down
  if (normalizedAngle > 90 && normalizedAngle < 270) {
    rotation += 180;
  }

  // Adjust anchor based on position
  if (normalizedAngle >= 350 || normalizedAngle <= 10) {
    textAnchor = 'start';
    alignmentBaseline = 'middle';
  } else if (normalizedAngle >= 170 && normalizedAngle <= 190) {
    textAnchor = 'end';
    alignmentBaseline = 'middle';
  }

  return { textAnchor, rotation, alignmentBaseline };
}

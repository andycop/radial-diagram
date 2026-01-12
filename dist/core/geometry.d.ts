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
export declare function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number): Point;
/**
 * Generate SVG arc path data
 * @param cx Center X
 * @param cy Center Y
 * @param radius Arc radius
 * @param startAngle Start angle in degrees
 * @param endAngle End angle in degrees
 * @returns SVG path d attribute for the arc
 */
export declare function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string;
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
export declare function segmentPath(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string;
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
export declare function facetScorePath(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string;
/**
 * Calculate the angle span for each segment
 * @param segmentCount Number of segments (must be > 0)
 * @returns Angle in degrees per segment
 * @throws Error if segmentCount is not greater than 0
 */
export declare function segmentAngle(segmentCount: number): number;
/**
 * Calculate angles for facets within a segment
 * @param segmentStartAngle Start angle of the segment
 * @param segmentEndAngle End angle of the segment
 * @param facetCount Number of facets in segment (must be > 0)
 * @returns Array of { startAngle, endAngle, midAngle } for each facet
 * @throws Error if facetCount is not greater than 0
 */
export declare function facetAngles(segmentStartAngle: number, segmentEndAngle: number, facetCount: number): Array<{
    startAngle: number;
    endAngle: number;
    midAngle: number;
}>;
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
export declare function scoreToRadius(score: number, minScore: number, maxScore: number, innerRadius: number, outerRadius: number): number;
/**
 * Calculate radii for ring grid lines
 * @param ringCount Number of rings (must be > 0)
 * @param innerRadius Inner radius (center hub)
 * @param outerRadius Outer radius
 * @throws Error if ringCount is not greater than 0 or innerRadius >= outerRadius
 */
export declare function ringRadii(ringCount: number, innerRadius: number, outerRadius: number): number[];
/**
 * Calculate text anchor and rotation for labels at an angle
 * @param angle Angle in degrees
 * @returns Object with textAnchor and rotation for readable text
 */
export declare function labelOrientation(angle: number): {
    textAnchor: 'start' | 'middle' | 'end';
    rotation: number;
    alignmentBaseline: string;
};
//# sourceMappingURL=geometry.d.ts.map
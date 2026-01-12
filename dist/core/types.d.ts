/**
 * Configuration types for the Radial Diagram Generator
 *
 * @license MIT
 * @copyright 2026 CGA Management Ltd
 * @see https://www.cgamanagement.co.uk/category/tools
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export interface Facet {
    /** Display name for this facet */
    name: string;
    /** Score value (within scale min-max range) */
    score?: number;
    /** Optional description for tooltips */
    description?: string;
}
export interface Segment {
    /** Display name for the segment */
    name: string;
    /** Segment fill color (hex or CSS color) */
    color: string;
    /** Facets within this segment */
    facets: Facet[];
}
export interface CenterConfig {
    /** Label text for center hub */
    label: string;
    /** Radius of center hub in pixels */
    radius: number;
    /** Fill color for center hub */
    color: string;
    /** Optional secondary line of text */
    subtitle?: string;
    /** Border/stroke width (0 for no border) */
    borderWidth?: number;
    /** Border/stroke color */
    borderColor?: string;
    /** Set to false to hide the center hub entirely */
    visible?: boolean;
    /** Font size for center hub label (overrides style.hubFontSize) */
    fontSize?: number;
    /** Font color for center hub label (overrides style.hubFontColor) */
    fontColor?: string;
}
export interface ScaleConfig {
    /** Minimum score value */
    min: number;
    /** Maximum score value */
    max: number;
    /** Number of concentric rings to display */
    rings: number;
    /** Optional labels for each ring level */
    ringLabels?: string[];
}
export interface StyleConfig {
    /** Show concentric ring circles */
    showRings?: boolean;
    /** Color for ring circles */
    ringColor?: string;
    /** Width of ring circle strokes */
    ringWidth?: number;
    /** Style of ring circles: 'solid' or 'dashed' */
    ringStyle?: 'solid' | 'dashed';
    /** Show score level labels */
    showScoreLabels?: boolean;
    /** Font size for score labels */
    scoreLabelFontSize?: number;
    /** Fill color for score labels */
    scoreLabelColor?: string;
    /** Stroke/outline color for score labels */
    scoreLabelStrokeColor?: string;
    /** Show facet points on arcs */
    showFacetPoints?: boolean;
    /** Style of facet points: 'circle', 'dot', 'none' */
    facetPointStyle?: 'circle' | 'dot' | 'none';
    /** Opacity of facet score fill areas (0-1) */
    facetOpacity?: number;
    /** Width of segment divider lines */
    segmentDividerWidth?: number;
    /** Font family for labels */
    fontFamily?: string;
    /** Background color (default transparent) */
    backgroundColor?: string;
    /** Color for segment divider lines */
    segmentDividerColor?: string;
    /** Show segment divider lines */
    showSegmentDividers?: boolean;
    /** Font size for center hub label */
    hubFontSize?: number;
    /** Font color for center hub label */
    hubFontColor?: string;
    /** Font size for segment labels */
    segmentFontSize?: number;
    /** Font size for facet labels */
    facetFontSize?: number;
    /** Font color for facet labels */
    facetFontColor?: string;
}
export interface DiagramConfig {
    /** Center hub configuration */
    center: CenterConfig;
    /** Score scale configuration */
    scale: ScaleConfig;
    /** Outer segments */
    segments: Segment[];
    /** Visual style options */
    style: StyleConfig;
    /** Total diagram size in pixels (width = height) */
    size: number;
    /** Starting angle offset in degrees (-90 = top, 0 = right) */
    startAngle: number;
}
/** Default style configuration */
export declare const DEFAULT_STYLE: StyleConfig;
/** Default scale configuration */
export declare const DEFAULT_SCALE: ScaleConfig;
/** Result of config validation */
export interface ValidationResult {
    /** Whether the config is valid */
    valid: boolean;
    /** List of validation error messages */
    errors: string[];
}
/**
 * Validate a diagram configuration
 * @param config The config to validate
 * @returns ValidationResult with valid flag and any error messages
 */
export declare function validateConfig(config: DiagramConfig): ValidationResult;
/** Create a complete config with defaults filled in */
export declare function createConfig(partial: Partial<DiagramConfig>): DiagramConfig;
//# sourceMappingURL=types.d.ts.map
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
    /**
     * Optional figure text (e.g. a raw score "3.7" or a percentage "74%")
     * rendered in a tidy ring just outside the centre hub at this facet's
     * mid-angle. The renderer prints the string verbatim, so the caller decides
     * the format. Only drawn when set; see `style.facetFigure*` options.
     */
    figure?: string;
}
export interface Segment {
    /** Display name for the segment */
    name: string;
    /** Segment fill color (hex or CSS color) */
    color: string;
    /** Override fill for the dimension label band. Falls back to `color` when unset. */
    labelColor?: string;
    /** Facets within this segment */
    facets: Facet[];
    /**
     * Optional secondary line rendered directly below the section name on the
     * coloured label band (slightly smaller radius, same curve). Printed
     * verbatim, so the caller supplies the string (e.g. a section average "3.7"
     * or a percentage "74%"). Only drawn when set; styled via
     * `style.segmentSubLabel*`.
     */
    subLabel?: string;
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
    /** Opacity of the unscored segment background track (0-1). Default 0.3. */
    trackOpacity?: number;
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
    /**
     * How facet (subcategory) labels are placed:
     * - `'default'` (or unset): the original italic labels sitting just inside
     *   the outer edge (existing behaviour, unchanged).
     * - `'outer-edge'`: labels read radially along the outer edge of each petal,
     *   right-aligned to the coloured band, upright on every side, with the
     *   styling knobs below. Use for the Team Effectiveness (Diagnostic) wheel.
     */
    facetLabelPlacement?: 'default' | 'outer-edge';
    /** [`outer-edge` only] Uppercase facet label text. Default true in that mode. */
    facetLabelUppercase?: boolean;
    /** [`outer-edge` only] Facet label font weight. Default 700 in that mode. */
    facetLabelWeight?: number | string;
    /** [`outer-edge` only] Facet label CSS letter-spacing (e.g. '0.04em'). Default '0.04em' in that mode. */
    facetLabelLetterSpacing?: string;
    /**
     * [`outer-edge` only] Auto-wrap multi-word facet labels onto two balanced
     * lines, keeping a trailing '&' with the word before it (e.g. "DIRECTION &"
     * / "PURPOSE"). An explicit '\n' in the name always wins. Default true in
     * that mode.
     */
    facetLabelWrap?: boolean;
    /** Font size for the per-facet figure ring (facet.figure). Default 12. */
    facetFigureFontSize?: number;
    /** Fill colour for the per-facet figure ring. Default '#555555'. */
    facetFigureColor?: string;
    /**
     * Radial gap in pixels from the hub edge to the figure ring baseline; the
     * ring radius is `center.radius + facetFigureGap`. Default = facetFigureFontSize.
     */
    facetFigureGap?: number;
    /**
     * When true, rotate each facet figure to follow the spoke/radial direction
     * (upright-flipped on the bottom/left half). When false (default), figures
     * are upright horizontal.
     */
    facetFigureRotate?: boolean;
    /** Fill colour for the segment sub-label (segment.subLabel). Default '#ffffff'. */
    segmentSubLabelColor?: string;
    /**
     * Segment sub-label font size as a fraction of the (auto-scaled) section-name
     * font size. Default 0.62. The sub-label is rendered at regular weight.
     */
    segmentSubLabelFontScale?: number;
    /** Where to render segment (dimension) labels: 'outer' = curved arc band outside the wheel; 'inner' = curved arc on top of the wedge near the centre hub */
    segmentLabelPosition?: 'outer' | 'inner';
    /** Draw small directional arrows on each segment boundary indicating flow. Undefined = no arrows. */
    flowDirection?: 'clockwise' | 'counterclockwise';
    /** When `flowDirection` is set, also draw the arrow that wraps from the last segment back to the first. Default false. */
    flowCloseLoop?: boolean;
    /** Fill colour for flow arrows. Falls back to `segmentDividerColor`. */
    flowArrowColor?: string;
    /** Size (length) of flow arrows in pixels. Default 14. */
    flowArrowSize?: number;
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
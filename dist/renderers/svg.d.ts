/**
 * SVG Renderer for Radial Diagrams
 *
 * @license MIT
 * @copyright 2026 CGA Management Ltd
 * @see https://www.cgamanagement.co.uk/category/tools
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { DiagramConfig } from '../core/types.js';
export declare class SVGRenderer {
    private config;
    private cx;
    private cy;
    private outerRadius;
    private padding;
    constructor(config: DiagramConfig);
    /**
     * Generate complete SVG string
     */
    render(): string;
    private wrapSVG;
    private renderBackground;
    private renderRings;
    private renderScoreLabels;
    private renderSegmentBackgrounds;
    private renderScoreFills;
    private renderSegmentDividers;
    /**
     * True when a flow arrow is rendered at the given segment boundary index.
     * Boundary 0 is the wrap-around (between segment n-1 and segment 0); the
     * arrow there is opt-in via `style.flowCloseLoop`. Boundaries 1..n-1 are
     * the in-between divisions and always carry an arrow when flow is enabled.
     */
    /**
     * Angular inset (degrees per side) for a facet's fill/track, driven by
     * `style.facetPadding`. Returns 0 when padding is off. `'auto'` mirrors the
     * mockup formula `min(0.9, facetStepDegrees * 0.06)`; a number is used as-is.
     */
    private facetPad;
    private hasFlowArrowAt;
    /**
     * When flow arrows are enabled, each segment's label is shifted in the flow
     * direction by half the arrow's tip extent so the label sits centred over
     * the segment-plus-arrow combined extent. Returns shift in degrees (signed).
     */
    private flowLabelShiftDeg;
    /**
     * Draw a chunky wedge-shaped arrow on each segment-to-segment boundary,
     * indicating flow around the wheel. The arrow lives on the dimension
     * label band (whichever side `style.segmentLabelPosition` puts it),
     * coloured to match the source segment by default. Wrap-around
     * (last → first) is opt-in via `style.flowCloseLoop`. Triggered by
     * `style.flowDirection` being set.
     */
    private renderFlowArrows;
    private renderFacetDividers;
    private renderCenterHub;
    private renderFacetLabels;
    /**
     * Split a facet label into at most two balanced lines. An explicit `\n`
     * always wins. Otherwise a multi-word label is split at the point that makes
     * the two lines' character counts as even as possible, with one rule: a lone
     * "&" never starts the second line, so a trailing "&" stays with the word
     * before it (e.g. "DIRECTION &" / "PURPOSE"). Single-word labels stay on one
     * line.
     */
    private wrapFacetLabel;
    /**
     * Facet labels read radially along the outer edge of each petal,
     * right-aligned to the coloured band and kept upright on every side.
     * Uppercase / weight / letter-spacing / two-line balanced wrap are all
     * driven by `style.facetLabel*`. Triggered by
     * `style.facetLabelPlacement === 'outer-edge'`.
     */
    private renderFacetLabelsOuterEdge;
    /**
     * Small figure per facet (raw score or percentage) in a tidy ring just
     * outside the centre hub, at each facet's mid-angle. Regular weight, no
     * circle/ring/background. Optionally rotated to follow the spoke.
     * Only invoked when at least one facet supplies a `figure`.
     */
    private renderFacetFigures;
    private renderSegmentLabels;
    private renderSegmentLabelsInner;
    /** Scale segment font size to fit the longest single line within a segment's arc. */
    private scaleSegmentFontSize;
    /**
     * Emit one or more textPath rows for a segment label. When `name` contains
     * `\n`, each line is rendered on its own arc at a different radius within
     * the band, stacked along the radial axis.
     */
    private emitSegmentLabelLines;
    private renderSegmentLabelsOuter;
}
/**
 * Convenience function to render a diagram from config
 */
export declare function renderDiagram(config: DiagramConfig): string;
//# sourceMappingURL=svg.d.ts.map
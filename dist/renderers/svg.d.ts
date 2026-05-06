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
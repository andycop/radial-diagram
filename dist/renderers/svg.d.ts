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
    private renderFacetDividers;
    private renderCenterHub;
    private renderFacetLabels;
    private renderSegmentLabels;
}
/**
 * Convenience function to render a diagram from config
 */
export declare function renderDiagram(config: DiagramConfig): string;
//# sourceMappingURL=svg.d.ts.map
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
import { validateConfig } from '../core/types.js';
import { polarToCartesian, segmentPath, facetAngles, scoreToRadius, ringRadii, segmentAngle, } from '../core/geometry.js';
export class SVGRenderer {
    constructor(config) {
        this.padding = 70; // Extra space for labels outside the wheel
        // Validate config before using
        const validation = validateConfig(config);
        if (!validation.valid) {
            throw new Error(`Invalid diagram configuration:\n- ${validation.errors.join('\n- ')}`);
        }
        this.config = config;
        this.cx = config.size / 2;
        this.cy = config.size / 2;
        this.outerRadius = (config.size / 2) * 0.9; // 90% of half-size for padding
    }
    /**
     * Generate complete SVG string
     */
    render() {
        const elements = [];
        // Background
        if (this.config.style.backgroundColor) {
            elements.push(this.renderBackground());
        }
        // Segment backgrounds
        elements.push(this.renderSegmentBackgrounds());
        // Score fills for each facet
        elements.push(this.renderScoreFills());
        // Segment divider lines
        if (this.config.style.showSegmentDividers) {
            elements.push(this.renderSegmentDividers());
        }
        // Facet divider lines and points
        elements.push(this.renderFacetDividers());
        // Center hub
        elements.push(this.renderCenterHub());
        // Facet labels
        elements.push(this.renderFacetLabels());
        // Segment labels (on outer ring)
        elements.push(this.renderSegmentLabels());
        // Rings and score labels render on top of everything
        if (this.config.style.showRings !== false) {
            elements.push(this.renderRings());
        }
        if (this.config.style.showScoreLabels) {
            elements.push(this.renderScoreLabels());
        }
        return this.wrapSVG(elements.join('\n'));
    }
    wrapSVG(content) {
        const { size, style, center } = this.config;
        const viewSize = size + this.padding * 2;
        // Support both center.fontSize/fontColor and style.hubFontSize/hubFontColor
        const hubFontSize = center.fontSize || style.hubFontSize || 14;
        const hubFontColor = center.fontColor || style.hubFontColor || '#ffffff';
        const segmentFontSize = style.segmentFontSize || 28;
        const facetFontSize = style.facetFontSize || 11;
        const facetFontColor = style.facetFontColor || '#000000';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-this.padding} ${-this.padding} ${viewSize} ${viewSize}" width="${size}" height="${size}">
  <style>
    .segment-label { font-family: ${style.fontFamily}; font-weight: bold; font-size: ${segmentFontSize}px; fill: white; dominant-baseline: middle; }
    .facet-label { font-family: ${style.fontFamily}; font-size: ${facetFontSize}px; font-style: italic; fill: ${facetFontColor}; }
    .center-label { font-family: ${style.fontFamily}; font-weight: bold; font-size: ${hubFontSize}px; fill: ${hubFontColor}; text-anchor: middle; }
    .ring-label { font-family: ${style.fontFamily}; font-size: 10px; fill: #666; }
  </style>
  ${content}
</svg>`;
    }
    renderBackground() {
        const viewSize = this.config.size + this.padding * 2;
        return `<rect x="${-this.padding}" y="${-this.padding}" width="${viewSize}" height="${viewSize}" fill="${this.config.style.backgroundColor}" />`;
    }
    renderRings() {
        const { scale, center, style } = this.config;
        const rings = ringRadii(scale.rings, center.radius, this.outerRadius);
        const elements = [];
        const ringColor = style.ringColor || '#cccccc';
        const ringWidth = style.ringWidth || 1;
        const ringStyle = style.ringStyle || 'dashed';
        const dashArray = ringStyle === 'dashed' ? 'stroke-dasharray="4,4"' : '';
        // Draw ring circles
        rings.forEach((radius, i) => {
            if (i === 0)
                return; // Skip innermost (center hub boundary)
            elements.push(`<circle cx="${this.cx}" cy="${this.cy}" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="${ringWidth}" ${dashArray} />`);
        });
        return `<g class="rings">${elements.join('\n')}</g>`;
    }
    renderScoreLabels() {
        const { scale, center, style } = this.config;
        const elements = [];
        const fontSize = style.scoreLabelFontSize || 14;
        const fillColor = style.scoreLabelColor || '#ffffff';
        const strokeColor = style.scoreLabelStrokeColor || '#333333';
        // Add scale labels (1-5) at each ring level, positioned at top
        const ringStep = (this.outerRadius - center.radius) / scale.rings;
        for (let i = 0; i < scale.rings; i++) {
            const label = scale.min + i;
            const labelRadius = center.radius + ((i + 0.5) * ringStep); // Middle of each band
            const y = this.cy - labelRadius;
            // Text with outline for visibility on any background
            elements.push(`<text x="${this.cx}" y="${y}" font-family="${style.fontFamily}" font-size="${fontSize}px" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3" paint-order="stroke">${label}</text>`);
        }
        return `<g class="score-labels">${elements.join('\n')}</g>`;
    }
    renderSegmentBackgrounds() {
        const { segments, center, startAngle } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        segments.forEach((segment, i) => {
            const sStart = startAngle + i * segAngle;
            const sEnd = sStart + segAngle;
            // Full segment background (lighter shade)
            const bgPath = segmentPath(this.cx, this.cy, center.radius, this.outerRadius, sStart, sEnd);
            elements.push(`<path d="${bgPath}" fill="${segment.color}" opacity="0.3" />`);
        });
        return `<g class="segment-backgrounds">${elements.join('\n')}</g>`;
    }
    renderScoreFills() {
        const { segments, center, scale, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            segment.facets.forEach((facet, facetIndex) => {
                if (facet.score === undefined || facet.score === null)
                    return;
                const { startAngle: fStart, endAngle: fEnd } = facetAngleData[facetIndex];
                const scoreRadius = scoreToRadius(facet.score, scale.min, scale.max, center.radius, this.outerRadius);
                const fillPath = segmentPath(this.cx, this.cy, center.radius, scoreRadius, fStart, fEnd);
                elements.push(`<path d="${fillPath}" fill="${segment.color}" opacity="${style.facetOpacity}" />`);
            });
        });
        return `<g class="score-fills">${elements.join('\n')}</g>`;
    }
    renderSegmentDividers() {
        const { segments, center, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        segments.forEach((_, i) => {
            const angle = startAngle + i * segAngle;
            const inner = polarToCartesian(this.cx, this.cy, center.radius, angle);
            const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, angle);
            elements.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`);
        });
        return `<g class="segment-dividers">${elements.join('\n')}</g>`;
    }
    renderFacetDividers() {
        const { segments, center, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            // Draw dividers between facets (skip first one which is segment divider)
            facetAngleData.forEach((facet, facetIndex) => {
                if (facetIndex === 0)
                    return; // First facet starts at segment boundary
                const inner = polarToCartesian(this.cx, this.cy, center.radius, facet.startAngle);
                const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, facet.startAngle);
                elements.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="1" opacity="0.5" />`);
            });
            // Draw facet points if enabled
            if (style.showFacetPoints && style.facetPointStyle !== 'none') {
                facetAngleData.forEach((facetData) => {
                    const pointRadius = style.facetPointStyle === 'circle' ? 6 : 3;
                    const arcRadius = this.outerRadius - 20; // Position points near outer edge
                    const point = polarToCartesian(this.cx, this.cy, arcRadius, facetData.midAngle);
                    elements.push(`<circle cx="${point.x}" cy="${point.y}" r="${pointRadius}" fill="white" stroke="${style.segmentDividerColor}" stroke-width="1" />`);
                });
            }
        });
        return `<g class="facet-dividers">${elements.join('\n')}</g>`;
    }
    renderCenterHub() {
        const { center, style } = this.config;
        // Check if hub should be visible (default true)
        if (center.visible === false) {
            return '';
        }
        const elements = [];
        const borderWidth = center.borderWidth || 0;
        const borderColor = center.borderColor || '#ffffff';
        // Hub circle with optional border
        if (borderWidth > 0) {
            elements.push(`<circle cx="${this.cx}" cy="${this.cy}" r="${center.radius}" fill="${center.color}" stroke="${borderColor}" stroke-width="${borderWidth}" />`);
        }
        else {
            elements.push(`<circle cx="${this.cx}" cy="${this.cy}" r="${center.radius}" fill="${center.color}" />`);
        }
        // Hub label (split into lines if contains &)
        const lines = center.label.split('&').map((s) => s.trim());
        // Auto-scale font to fit hub (scales up or down)
        const availableWidth = center.radius * 1.6; // Use 80% of diameter
        const maxLineLength = Math.max(...lines.map((l, idx) => l.length + (lines.length > 1 && idx === 1 ? 2 : 0))); // +2 for "& "
        const scaledFontSize = Math.floor(availableWidth / (maxLineLength * 0.6));
        const lineHeight = scaledFontSize * 1.2;
        if (lines.length === 1) {
            const safeLabel = center.label.replace(/&/g, '&amp;');
            elements.push(`<text x="${this.cx}" y="${this.cy}" class="center-label" style="font-size: ${scaledFontSize}px" dominant-baseline="middle">${safeLabel}</text>`);
        }
        else {
            const startY = this.cy - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, i) => {
                const y = startY + i * lineHeight;
                const text = i === 1 ? `&amp; ${line}` : line;
                elements.push(`<text x="${this.cx}" y="${y}" class="center-label" style="font-size: ${scaledFontSize}px" dominant-baseline="middle">${text}</text>`);
            });
        }
        return `<g class="center-hub">${elements.join('\n')}</g>`;
    }
    renderFacetLabels() {
        const { segments, center, startAngle } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        const labelRadius = this.outerRadius - 20;
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const segMid = (segStart + segEnd) / 2;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            // Determine orientation based on SEGMENT mid-angle (same for all facets in segment)
            const normalizedSegMid = ((segMid % 360) + 360) % 360;
            // Flip for readability in bottom half (90, 270]
            const needsFlip = normalizedSegMid > 90 && normalizedSegMid <= 270;
            const rotationOffset = needsFlip ? 180 : 0;
            // Anchor: 'end' for top half (text reads inner to outer)
            //         'start' for bottom half (text reads outer to inner)
            const isTopHalf = normalizedSegMid <= 90 || normalizedSegMid > 270;
            const anchor = isTopHalf ? 'end' : 'start';
            segment.facets.forEach((facet, facetIndex) => {
                const { midAngle } = facetAngleData[facetIndex];
                const rotation = midAngle + rotationOffset;
                const pos = polarToCartesian(this.cx, this.cy, labelRadius, midAngle);
                // Escape & for valid XML
                const safeName = facet.name.replace(/&/g, '&amp;');
                elements.push(`<text x="${pos.x}" y="${pos.y}" class="facet-label" text-anchor="${anchor}" dominant-baseline="middle" transform="rotate(${rotation}, ${pos.x}, ${pos.y})">${safeName}</text>`);
            });
        });
        return `<g class="facet-labels">${elements.join('\n')}</g>`;
    }
    renderSegmentLabels() {
        const { segments, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const defs = [];
        const backgrounds = [];
        const dividers = [];
        const texts = [];
        // Calculate arc thickness using golden ratio: fontSize * phi + fontSize
        const baseFontSize = style.segmentFontSize || 28;
        const phi = 1.618;
        const arcThickness = (baseFontSize * phi) + baseFontSize;
        const dividerWidth = style.segmentDividerWidth || 4;
        // Position arc with divider gap, vertically center text
        const innerLabelRadius = this.outerRadius + (dividerWidth / 2);
        const outerLabelRadius = innerLabelRadius + arcThickness;
        const textRadius = innerLabelRadius + (arcThickness / 2); // Vertically centered
        // Calculate font size to fit longest segment name
        const arcLength = textRadius * (segAngle - 6) * (Math.PI / 180);
        const maxNameLength = Math.max(...segments.map(s => s.name.length));
        const estTextWidth = (maxNameLength + 1) * baseFontSize * 0.6; // +1 char padding, 0.6 width estimate
        const scaledFontSize = estTextWidth > arcLength
            ? Math.floor(baseFontSize * (arcLength / estTextWidth))
            : baseFontSize;
        segments.forEach((segment, i) => {
            const segStart = startAngle + i * segAngle;
            const segEnd = segStart + segAngle;
            const midAngle = (segStart + segEnd) / 2;
            const pathId = `segment-path-${i}`;
            // Background arc segment
            const bgPath = segmentPath(this.cx, this.cy, innerLabelRadius, outerLabelRadius, segStart, segEnd);
            backgrounds.push(`<path d="${bgPath}" fill="${segment.color}" />`);
            // Segment divider line (same as main segments)
            if (style.showSegmentDividers) {
                const inner = polarToCartesian(this.cx, this.cy, innerLabelRadius, segStart);
                const outer = polarToCartesian(this.cx, this.cy, outerLabelRadius, segStart);
                dividers.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`);
            }
            // Escape & for valid XML
            const safeName = segment.name.replace(/&/g, '&amp;');
            // Determine if text should go clockwise or counter-clockwise for readability
            // Counter-clockwise for segments on the east side (15°-165°), clockwise otherwise
            const normalizedMid = ((midAngle % 360) + 360) % 360;
            const useClockwise = normalizedMid < 15 || normalizedMid > 165;
            if (useClockwise) {
                // Clockwise arc for most segments
                const start = polarToCartesian(this.cx, this.cy, textRadius, segStart + 3);
                const end = polarToCartesian(this.cx, this.cy, textRadius, segEnd - 3);
                const largeArc = segAngle - 6 > 180 ? 1 : 0;
                defs.push(`<path id="${pathId}" d="M ${start.x} ${start.y} A ${textRadius} ${textRadius} 0 ${largeArc} 1 ${end.x} ${end.y}" fill="none" />`);
            }
            else {
                // Counter-clockwise arc for east side segments (30°-150°)
                const start = polarToCartesian(this.cx, this.cy, textRadius, segEnd - 3);
                const end = polarToCartesian(this.cx, this.cy, textRadius, segStart + 3);
                const largeArc = segAngle - 6 > 180 ? 1 : 0;
                defs.push(`<path id="${pathId}" d="M ${start.x} ${start.y} A ${textRadius} ${textRadius} 0 ${largeArc} 0 ${end.x} ${end.y}" fill="none" />`);
            }
            texts.push(`<text class="segment-label" fill="white" style="font-size: ${scaledFontSize}px"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${safeName}</textPath></text>`);
        });
        // Add divider ring between main segments and label arc
        const ringDivider = style.showSegmentDividers
            ? `<circle cx="${this.cx}" cy="${this.cy}" r="${this.outerRadius}" fill="none" stroke="${style.segmentDividerColor}" stroke-width="${dividerWidth}" />`
            : '';
        return `<defs>${defs.join('\n')}</defs>\n${ringDivider}\n<g class="segment-label-backgrounds">${backgrounds.join('\n')}</g>\n<g class="segment-label-dividers">${dividers.join('\n')}</g>\n<g class="segment-labels">${texts.join('\n')}</g>`;
    }
}
/**
 * Convenience function to render a diagram from config
 */
export function renderDiagram(config) {
    const renderer = new SVGRenderer(config);
    return renderer.render();
}
//# sourceMappingURL=svg.js.map
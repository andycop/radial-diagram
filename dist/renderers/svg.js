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
        // Per-facet figures in a ring just outside the hub, opt-in: only pushed
        // when at least one facet supplies a `figure`, so configs that don't use
        // the feature keep byte-identical output.
        if (this.config.segments.some((s) => s.facets.some((f) => f.figure))) {
            elements.push(this.renderFacetFigures());
        }
        // Segment labels (on outer ring)
        elements.push(this.renderSegmentLabels());
        // Rings and score labels render on top of everything
        if (this.config.style.showRings !== false) {
            elements.push(this.renderRings());
        }
        if (this.config.style.showScoreLabels) {
            elements.push(this.renderScoreLabels());
        }
        // Flow arrows on top — opt-in via style.flowDirection.
        if (this.config.style.flowDirection) {
            elements.push(this.renderFlowArrows());
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
        const segmentFontFamily = style.segmentFontFamily || style.fontFamily;
        const segmentLetterSpacing = style.segmentLetterSpacing ? ` letter-spacing: ${style.segmentLetterSpacing};` : '';
        const hubFontFamily = center.fontFamily || style.fontFamily;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-this.padding} ${-this.padding} ${viewSize} ${viewSize}" width="${size}" height="${size}">
  <style>
    .segment-label { font-family: ${segmentFontFamily}; font-weight: bold; font-size: ${segmentFontSize}px; fill: white; dominant-baseline: middle;${segmentLetterSpacing} }
    .facet-label { font-family: ${style.fontFamily}; font-size: ${facetFontSize}px; font-style: italic; fill: ${facetFontColor}; }
    .center-label { font-family: ${hubFontFamily}; font-weight: bold; font-size: ${hubFontSize}px; fill: ${hubFontColor}; text-anchor: middle; }
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
        const { segments, center, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        const trackOpacity = style.trackOpacity ?? 0.3;
        const padded = style.facetPadding !== undefined && style.facetPadding !== null;
        segments.forEach((segment, i) => {
            const sStart = startAngle + i * segAngle;
            const sEnd = sStart + segAngle;
            if (padded) {
                // Per-facet track so the angular gaps show up in the unscored area too.
                const facetAngleData = facetAngles(sStart, sEnd, segment.facets.length);
                facetAngleData.forEach(({ startAngle: fStart, endAngle: fEnd }) => {
                    const pad = this.facetPad(fEnd - fStart);
                    const a0 = fStart + pad;
                    const a1 = fEnd - pad;
                    if (a1 <= a0)
                        return;
                    const trackPath = segmentPath(this.cx, this.cy, center.radius, this.outerRadius, a0, a1);
                    elements.push(`<path d="${trackPath}" fill="${segment.color}" opacity="${trackOpacity}" />`);
                });
                return;
            }
            // Full segment background (lighter shade)
            const bgPath = segmentPath(this.cx, this.cy, center.radius, this.outerRadius, sStart, sEnd);
            elements.push(`<path d="${bgPath}" fill="${segment.color}" opacity="${trackOpacity}" />`);
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
                const { startAngle: rawStart, endAngle: rawEnd } = facetAngleData[facetIndex];
                const pad = this.facetPad(rawEnd - rawStart);
                const fStart = rawStart + pad;
                const fEnd = rawEnd - pad;
                if (fEnd <= fStart)
                    return;
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
            // Suppress the divider at boundaries where a flow arrow already
            // sits on the band — the line previously appeared to "go through"
            // the arrow because it kept extending into the wedge area.
            if (this.hasFlowArrowAt(i, segments.length))
                return;
            const angle = startAngle + i * segAngle;
            const inner = polarToCartesian(this.cx, this.cy, center.radius, angle);
            const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, angle);
            elements.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`);
        });
        return `<g class="segment-dividers">${elements.join('\n')}</g>`;
    }
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
    facetPad(stepDegrees) {
        const fp = this.config.style.facetPadding;
        if (fp === undefined || fp === null)
            return 0;
        if (fp === 'auto')
            return Math.min(0.9, stepDegrees * 0.06);
        return fp;
    }
    hasFlowArrowAt(boundaryIndex, totalSegments) {
        const style = this.config.style;
        if (!style.flowDirection)
            return false;
        if (boundaryIndex === 0)
            return !!style.flowCloseLoop;
        return boundaryIndex >= 1 && boundaryIndex < totalSegments;
    }
    /**
     * When flow arrows are enabled, each segment's label is shifted in the flow
     * direction by half the arrow's tip extent so the label sits centred over
     * the segment-plus-arrow combined extent. Returns shift in degrees (signed).
     */
    flowLabelShiftDeg(bandMid, segAngleDeg, arcThickness) {
        const style = this.config.style;
        if (!style.flowDirection)
            return 0;
        const arrowSize = style.flowArrowSize ?? arcThickness;
        const rawAngular = (arrowSize / bandMid) * (180 / Math.PI);
        const tipAngularOffset = Math.min(rawAngular, segAngleDeg * 0.3);
        const sign = style.flowDirection === 'clockwise' ? 1 : -1;
        return (tipAngularOffset / 2) * sign;
    }
    /**
     * Draw a chunky wedge-shaped arrow on each segment-to-segment boundary,
     * indicating flow around the wheel. The arrow lives on the dimension
     * label band (whichever side `style.segmentLabelPosition` puts it),
     * coloured to match the source segment by default. Wrap-around
     * (last → first) is opt-in via `style.flowCloseLoop`. Triggered by
     * `style.flowDirection` being set.
     */
    renderFlowArrows() {
        const { segments, startAngle, style, center } = this.config;
        const direction = style.flowDirection;
        if (!direction)
            return '';
        const segAngleDeg = segmentAngle(segments.length);
        // Place the arrow on the same band as the dimension labels so it
        // visually attaches to the source segment. Computed exactly the same
        // way as renderSegmentLabelsInner / renderSegmentLabelsOuter.
        const labelPosition = style.segmentLabelPosition || 'outer';
        const baseFontSize = style.segmentFontSize || 28;
        const phi = 1.618;
        const maxLines = Math.max(...segments.map((s) => s.name.split('\n').length));
        const arcThickness = (baseFontSize * phi) + baseFontSize + (maxLines - 1) * baseFontSize * 1.2;
        const dividerWidth = style.segmentDividerWidth || 4;
        const bandInner = labelPosition === 'outer'
            ? this.outerRadius + dividerWidth / 2
            : center.radius + dividerWidth / 2;
        const bandOuter = bandInner + arcThickness;
        const bandMid = (bandInner + bandOuter) / 2;
        // Default: tip extends tangentially by the band's radial thickness, so
        // the arrow is roughly as long as the segment is "tall".
        const arrowSize = style.flowArrowSize ?? arcThickness;
        // Convert pixel length into angular degrees at bandMid; cap so the arrow
        // never spills more than 30 % of a segment into the neighbour.
        const rawAngular = (arrowSize / bandMid) * (180 / Math.PI);
        const tipAngularOffset = Math.min(rawAngular, segAngleDeg * 0.3);
        const closeLoop = !!style.flowCloseLoop;
        const stroke = style.segmentDividerColor || '#ffffff';
        const elements = [];
        for (let i = 0; i < segments.length; i++) {
            if (i === segments.length - 1 && !closeLoop)
                break;
            const sourceSeg = segments[i];
            const fill = style.flowArrowColor || sourceSeg.labelColor || sourceSeg.color;
            const boundaryAngle = startAngle + (i + 1) * segAngleDeg;
            const sign = direction === 'clockwise' ? 1 : -1;
            const tipAngle = boundaryAngle + tipAngularOffset * sign;
            const tip = polarToCartesian(this.cx, this.cy, bandMid, tipAngle);
            const baseInner = polarToCartesian(this.cx, this.cy, bandInner, boundaryAngle);
            const baseOuter = polarToCartesian(this.cx, this.cy, bandOuter, boundaryAngle);
            // Filled triangle (no stroke — strokes centred on a polygon edge bleed
            // half-width into the interior, which would draw a visible line down
            // the base side of the arrow on top of the fill).
            elements.push(`<polygon points="${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${baseInner.x.toFixed(2)},${baseInner.y.toFixed(2)} ${baseOuter.x.toFixed(2)},${baseOuter.y.toFixed(2)}" fill="${fill}" />`);
            // Outline on the two slanted sides only (baseInner → tip → baseOuter,
            // open polyline so the base edge stays unstroked).
            elements.push(`<polyline points="${baseInner.x.toFixed(2)},${baseInner.y.toFixed(2)} ${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${baseOuter.x.toFixed(2)},${baseOuter.y.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${dividerWidth}" stroke-linejoin="round" />`);
        }
        return `<g class="flow-arrows">${elements.join('\n')}</g>`;
    }
    renderFacetDividers() {
        const { segments, center, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            // Draw dividers between facets (skip first one which is segment divider).
            // `showFacetDividers` opts into a configurable style; false hides them;
            // unset keeps the original faint separators for backward compatibility.
            if (style.showFacetDividers !== false) {
                const useConfigured = style.showFacetDividers === true;
                const dividerAttrs = useConfigured
                    ? `stroke="${style.facetDividerColor ?? 'rgba(255,255,255,0.7)'}" stroke-width="${style.facetDividerWidth ?? 1.4}"`
                    : `stroke="${style.segmentDividerColor}" stroke-width="1" opacity="0.5"`;
                facetAngleData.forEach((facet, facetIndex) => {
                    if (facetIndex === 0)
                        return; // First facet starts at segment boundary
                    const inner = polarToCartesian(this.cx, this.cy, center.radius, facet.startAngle);
                    const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, facet.startAngle);
                    elements.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" ${dividerAttrs} />`);
                });
            }
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
        // Hub label (split on \n for multiple lines)
        const lines = center.label.split('\n').map((s) => s.trim());
        // Auto-scale font to fit hub (scales up or down)
        const availableWidth = center.radius * 1.6; // Use 80% of diameter
        const maxLineLength = Math.max(...lines.map((l) => l.length));
        const scaledFontSize = Math.floor(availableWidth / (maxLineLength * 0.6));
        const lineHeight = scaledFontSize * 1.2;
        const startY = this.cy - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
            const safe = line.replace(/&/g, '&amp;');
            const y = startY + i * lineHeight;
            elements.push(`<text x="${this.cx}" y="${y}" class="center-label" style="font-size: ${scaledFontSize}px" dominant-baseline="middle">${safe}</text>`);
        });
        return `<g class="center-hub">${elements.join('\n')}</g>`;
    }
    renderFacetLabels() {
        if (this.config.style.facetLabelPlacement === 'outer-edge') {
            return this.renderFacetLabelsOuterEdge();
        }
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
                // Escape & for valid XML, then split on \n for multi-line labels
                const safeName = facet.name.replace(/&/g, '&amp;');
                const lines = safeName.split('\n');
                let inner;
                if (lines.length === 1) {
                    inner = safeName;
                }
                else {
                    // Vertically centre the block: first line offset up by half the block height
                    const firstDy = -((lines.length - 1) * 0.6);
                    inner = lines
                        .map((line, i) => {
                        const dy = i === 0 ? `${firstDy}em` : '1.2em';
                        return `<tspan x="${pos.x}" dy="${dy}">${line}</tspan>`;
                    })
                        .join('');
                }
                elements.push(`<text x="${pos.x}" y="${pos.y}" class="facet-label" text-anchor="${anchor}" dominant-baseline="middle" transform="rotate(${rotation}, ${pos.x}, ${pos.y})">${inner}</text>`);
            });
        });
        return `<g class="facet-labels">${elements.join('\n')}</g>`;
    }
    /**
     * Split a facet label into at most two balanced lines. An explicit `\n`
     * always wins. Otherwise a multi-word label is split at the point that makes
     * the two lines' character counts as even as possible, with one rule: a lone
     * "&" never starts the second line, so a trailing "&" stays with the word
     * before it (e.g. "DIRECTION &" / "PURPOSE"). Single-word labels stay on one
     * line.
     */
    wrapFacetLabel(name) {
        if (name.includes('\n'))
            return name.split('\n');
        const words = name.split(' ').filter((w) => w.length > 0);
        if (words.length <= 1)
            return [name];
        let bestSplit = -1;
        let bestDiff = Infinity;
        for (let k = 1; k < words.length; k++) {
            if (words[k] === '&')
                continue; // "&" must not begin line two
            const line1 = words.slice(0, k).join(' ');
            const line2 = words.slice(k).join(' ');
            const diff = Math.abs(line1.length - line2.length);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestSplit = k;
            }
        }
        if (bestSplit === -1)
            return [name];
        return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
    }
    /**
     * Facet labels read radially along the outer edge of each petal,
     * right-aligned to the coloured band and kept upright on every side.
     * Uppercase / weight / letter-spacing / two-line balanced wrap are all
     * driven by `style.facetLabel*`. Triggered by
     * `style.facetLabelPlacement === 'outer-edge'`.
     */
    renderFacetLabelsOuterEdge() {
        const { segments, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        const gap = 10;
        const labelRadius = this.outerRadius - gap;
        const fontSize = style.facetFontSize || 11;
        const fontFamily = style.fontFamily;
        const color = style.facetFontColor || '#555555';
        const weight = style.facetLabelWeight ?? 700;
        const letterSpacing = style.facetLabelLetterSpacing ?? '0.04em';
        const uppercase = style.facetLabelUppercase ?? true;
        const wrap = style.facetLabelWrap ?? true;
        const textStyle = `font-family: ${fontFamily}; font-size: ${fontSize}px; ` +
            `font-weight: ${weight}; letter-spacing: ${letterSpacing}; fill: ${color};`;
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const segMid = (segStart + segEnd) / 2;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            const normalizedSegMid = ((segMid % 360) + 360) % 360;
            const needsFlip = normalizedSegMid > 90 && normalizedSegMid <= 270;
            const rotationOffset = needsFlip ? 180 : 0;
            const isTopHalf = normalizedSegMid <= 90 || normalizedSegMid > 270;
            const anchor = isTopHalf ? 'end' : 'start';
            segment.facets.forEach((facet, facetIndex) => {
                const { midAngle } = facetAngleData[facetIndex];
                const rotation = midAngle + rotationOffset;
                const pos = polarToCartesian(this.cx, this.cy, labelRadius, midAngle);
                const displayName = uppercase ? facet.name.toUpperCase() : facet.name;
                const lines = wrap
                    ? this.wrapFacetLabel(displayName)
                    : displayName.split('\n');
                const safeLines = lines.map((l) => l.replace(/&/g, '&amp;'));
                let inner;
                if (safeLines.length === 1) {
                    inner = safeLines[0];
                }
                else {
                    const firstDy = -((safeLines.length - 1) * 0.6);
                    inner = safeLines
                        .map((line, i) => {
                        const dy = i === 0 ? `${firstDy}em` : '1.2em';
                        return `<tspan x="${pos.x}" dy="${dy}">${line}</tspan>`;
                    })
                        .join('');
                }
                elements.push(`<text x="${pos.x}" y="${pos.y}" style="${textStyle}" text-anchor="${anchor}" dominant-baseline="middle" transform="rotate(${rotation}, ${pos.x}, ${pos.y})">${inner}</text>`);
            });
        });
        return `<g class="facet-labels">${elements.join('\n')}</g>`;
    }
    /**
     * Small figure per facet (raw score or percentage) in a tidy ring just
     * outside the centre hub, at each facet's mid-angle. Regular weight, no
     * circle/ring/background. Optionally rotated to follow the spoke.
     * Only invoked when at least one facet supplies a `figure`.
     */
    renderFacetFigures() {
        const { segments, center, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const elements = [];
        const fontSize = style.facetFigureFontSize ?? 12;
        const color = style.facetFigureColor ?? '#555555';
        const fontFamily = style.fontFamily;
        const gap = style.facetFigureGap ?? fontSize;
        const figureRadius = center.radius + gap;
        const rotate = style.facetFigureRotate ?? false;
        segments.forEach((segment, segIndex) => {
            const segStart = startAngle + segIndex * segAngle;
            const segEnd = segStart + segAngle;
            const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);
            segment.facets.forEach((facet, facetIndex) => {
                if (facet.figure === undefined || facet.figure === null || facet.figure === '')
                    return;
                const { midAngle } = facetAngleData[facetIndex];
                const pos = polarToCartesian(this.cx, this.cy, figureRadius, midAngle);
                const safe = String(facet.figure).replace(/&/g, '&amp;');
                let transform = '';
                if (rotate) {
                    const norm = ((midAngle % 360) + 360) % 360;
                    const rotation = midAngle + (norm > 90 && norm <= 270 ? 180 : 0);
                    transform = ` transform="rotate(${rotation}, ${pos.x}, ${pos.y})"`;
                }
                elements.push(`<text x="${pos.x}" y="${pos.y}" style="font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: normal; fill: ${color};" text-anchor="middle" dominant-baseline="middle"${transform}>${safe}</text>`);
            });
        });
        return `<g class="facet-figures">${elements.join('\n')}</g>`;
    }
    renderSegmentLabels() {
        if ((this.config.style.segmentLabelPosition || 'outer') === 'inner') {
            return this.renderSegmentLabelsInner();
        }
        return this.renderSegmentLabelsOuter();
    }
    renderSegmentLabelsInner() {
        const { segments, startAngle, style, center } = this.config;
        const segAngle = segmentAngle(segments.length);
        const defs = [];
        const backgrounds = [];
        const dividers = [];
        const texts = [];
        // Same band sizing as the outer mode (golden-ratio thickness), but anchored
        // to the centre hub edge instead of the outer wheel edge.
        const baseFontSize = style.segmentFontSize || 28;
        const phi = 1.618;
        const maxLines = Math.max(...segments.map((s) => s.name.split('\n').length));
        // When any segment carries a sub-label, reserve one sub-line-height of
        // extra band so the name block plus sub-label stays inside the band.
        const anySub = segments.some((s) => s.subLabel);
        const subFontScale = style.segmentSubLabelFontScale ?? 0.62;
        const subBand = anySub ? baseFontSize * subFontScale * 1.2 : 0;
        // Single-line band uses golden-ratio padding around the line.
        // Each extra line adds one line-height (1.2× fontSize).
        const arcThickness = (baseFontSize * phi) + baseFontSize + (maxLines - 1) * baseFontSize * 1.2 + subBand;
        const dividerWidth = style.segmentDividerWidth || 4;
        const innerLabelRadius = center.radius + (dividerWidth / 2);
        const outerLabelRadius = innerLabelRadius + arcThickness;
        const textRadius = innerLabelRadius + (arcThickness / 2);
        const scaledFontSize = this.scaleSegmentFontSize(segments, segAngle, textRadius, baseFontSize);
        const subFontSize = anySub ? Math.floor(scaledFontSize * subFontScale) : 0;
        const flowShiftDeg = this.flowLabelShiftDeg(textRadius, segAngle, arcThickness);
        segments.forEach((segment, i) => {
            const segStart = startAngle + i * segAngle;
            const segEnd = segStart + segAngle;
            const midAngle = (segStart + segEnd) / 2;
            const pathId = `segment-path-${i}`;
            // Solid coloured arc band sitting on the wedge's inner edge
            const bgPath = segmentPath(this.cx, this.cy, innerLabelRadius, outerLabelRadius, segStart, segEnd);
            backgrounds.push(`<path d="${bgPath}" fill="${segment.labelColor || segment.color}" />`);
            // Radial dividers between segments along the band — skipped where a
            // flow arrow already sits, so it doesn't re-introduce the line that
            // appears to cut through the arrow.
            if (style.showSegmentDividers && !this.hasFlowArrowAt(i, segments.length)) {
                const inner = polarToCartesian(this.cx, this.cy, innerLabelRadius, segStart);
                const outer = polarToCartesian(this.cx, this.cy, outerLabelRadius, segStart);
                dividers.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`);
            }
            this.emitSegmentLabelLines(defs, texts, pathId, segStart, segEnd, midAngle, textRadius, scaledFontSize, segment.name, flowShiftDeg, segment.subLabel, subFontSize);
        });
        // Ring dividers on both edges of the inner band: one between the band and
        // the centre hub, one between the band and the facet area.
        const ringDividers = style.showSegmentDividers
            ? [
                `<circle cx="${this.cx}" cy="${this.cy}" r="${innerLabelRadius}" fill="none" stroke="${style.segmentDividerColor}" stroke-width="${dividerWidth}" />`,
                `<circle cx="${this.cx}" cy="${this.cy}" r="${outerLabelRadius}" fill="none" stroke="${style.segmentDividerColor}" stroke-width="${dividerWidth}" />`,
            ].join('\n')
            : '';
        return `<defs>${defs.join('\n')}</defs>\n<g class="segment-label-backgrounds">${backgrounds.join('\n')}</g>\n${ringDividers}\n<g class="segment-label-dividers">${dividers.join('\n')}</g>\n<g class="segment-labels">${texts.join('\n')}</g>`;
    }
    /** Scale segment font size to fit the longest single line within a segment's arc. */
    scaleSegmentFontSize(segments, segAngle, textRadius, baseFontSize) {
        const arcLength = textRadius * (segAngle - 6) * (Math.PI / 180);
        const longestLineLength = Math.max(...segments.flatMap((s) => s.name.split('\n').map((l) => l.length)));
        const estTextWidth = (longestLineLength + 1) * baseFontSize * 0.6;
        return estTextWidth > arcLength
            ? Math.floor(baseFontSize * (arcLength / estTextWidth))
            : baseFontSize;
    }
    /**
     * Emit one or more textPath rows for a segment label. When `name` contains
     * `\n`, each line is rendered on its own arc at a different radius within
     * the band, stacked along the radial axis.
     */
    emitSegmentLabelLines(defs, texts, pathIdBase, segStart, segEnd, midAngle, textRadius, fontSize, rawName, flowShiftDeg = 0, subLabel, subFontSize = 0) {
        const segAngle = segEnd - segStart;
        const normalizedMid = ((midAngle % 360) + 360) % 360;
        const useClockwise = normalizedMid < 15 || normalizedMid > 165;
        // Top-half segments (clockwise arcs) read with the visually-first line at
        // the larger radius (outer edge); bottom-half segments (counter-clockwise
        // arcs) read with it at the smaller radius (closer to the hub).
        const sign = useClockwise ? -1 : 1;
        const largeArc = segAngle - 6 > 180 ? 1 : 0;
        // Shift the path's start/end by the same amount so the textPath midpoint
        // (and therefore the rendered text) moves in the flow direction.
        const startAng = segStart + 3 + flowShiftDeg;
        const endAng = segEnd - 3 + flowShiftDeg;
        // Build the ordered rows: name lines first (reading top to bottom), then
        // the optional sub-label directly below. Each row keeps its own font size.
        const displayName = this.config.style.segmentUppercase ? rawName.toUpperCase() : rawName;
        const nameLines = displayName.replace(/&/g, '&amp;').split('\n');
        const nameLineHeight = fontSize * 1.2;
        const hasSub = subLabel !== undefined && subLabel !== null && subLabel !== '';
        const rows = nameLines.map((t) => ({ text: t, size: fontSize, isSub: false }));
        if (hasSub) {
            rows.push({ text: String(subLabel).replace(/&/g, '&amp;'), size: subFontSize, isSub: true });
        }
        // Lay the rows out centred on textRadius. `u` runs in the reading-down
        // direction; the (signed) radial offset keeps the block centred and
        // reduces to the original single-name formula when there is no sub-label.
        const totalHeight = nameLines.length * nameLineHeight + (hasSub ? subFontSize * 1.2 : 0);
        const subColor = this.config.style.segmentSubLabelColor ?? '#ffffff';
        const fontFamily = this.config.style.fontFamily;
        let uCursor = 0;
        rows.forEach((row, idx) => {
            const rowHeight = row.size * 1.2;
            const uCenter = uCursor + rowHeight / 2;
            uCursor += rowHeight;
            const offset = sign * (uCenter - totalHeight / 2);
            const lineRadius = textRadius + offset;
            const linePathId = `${pathIdBase}-${idx}`;
            if (useClockwise) {
                const s = polarToCartesian(this.cx, this.cy, lineRadius, startAng);
                const e = polarToCartesian(this.cx, this.cy, lineRadius, endAng);
                defs.push(`<path id="${linePathId}" d="M ${s.x} ${s.y} A ${lineRadius} ${lineRadius} 0 ${largeArc} 1 ${e.x} ${e.y}" fill="none" />`);
            }
            else {
                const s = polarToCartesian(this.cx, this.cy, lineRadius, endAng);
                const e = polarToCartesian(this.cx, this.cy, lineRadius, startAng);
                defs.push(`<path id="${linePathId}" d="M ${s.x} ${s.y} A ${lineRadius} ${lineRadius} 0 ${largeArc} 0 ${e.x} ${e.y}" fill="none" />`);
            }
            if (row.isSub) {
                texts.push(`<text fill="${subColor}" style="font-family: ${fontFamily}; font-weight: normal; font-size: ${row.size}px; dominant-baseline: middle;"><textPath href="#${linePathId}" startOffset="50%" text-anchor="middle">${row.text}</textPath></text>`);
            }
            else {
                texts.push(`<text class="segment-label" fill="white" style="font-size: ${row.size}px"><textPath href="#${linePathId}" startOffset="50%" text-anchor="middle">${row.text}</textPath></text>`);
            }
        });
    }
    renderSegmentLabelsOuter() {
        const { segments, startAngle, style } = this.config;
        const segAngle = segmentAngle(segments.length);
        const defs = [];
        const backgrounds = [];
        const dividers = [];
        const texts = [];
        // Calculate arc thickness using golden ratio: fontSize * phi + fontSize.
        // Each extra line of text adds one line-height (1.2× fontSize).
        const baseFontSize = style.segmentFontSize || 28;
        const phi = 1.618;
        const maxLines = Math.max(...segments.map((s) => s.name.split('\n').length));
        // When any segment carries a sub-label, reserve one sub-line-height of
        // extra band so the name block plus sub-label stays inside the band.
        const anySub = segments.some((s) => s.subLabel);
        const subFontScale = style.segmentSubLabelFontScale ?? 0.62;
        const subBand = anySub ? baseFontSize * subFontScale * 1.2 : 0;
        const arcThickness = (baseFontSize * phi) + baseFontSize + (maxLines - 1) * baseFontSize * 1.2 + subBand;
        const dividerWidth = style.segmentDividerWidth || 4;
        // Position arc with divider gap, vertically center text
        const innerLabelRadius = this.outerRadius + (dividerWidth / 2);
        const outerLabelRadius = innerLabelRadius + arcThickness;
        const textRadius = innerLabelRadius + (arcThickness / 2); // Vertically centered
        const scaledFontSize = this.scaleSegmentFontSize(segments, segAngle, textRadius, baseFontSize);
        const subFontSize = anySub ? Math.floor(scaledFontSize * subFontScale) : 0;
        const flowShiftDeg = this.flowLabelShiftDeg(textRadius, segAngle, arcThickness);
        segments.forEach((segment, i) => {
            const segStart = startAngle + i * segAngle;
            const segEnd = segStart + segAngle;
            const midAngle = (segStart + segEnd) / 2;
            const pathId = `segment-path-${i}`;
            // Background arc segment
            const bgPath = segmentPath(this.cx, this.cy, innerLabelRadius, outerLabelRadius, segStart, segEnd);
            backgrounds.push(`<path d="${bgPath}" fill="${segment.labelColor || segment.color}" />`);
            // Segment divider line (same as main segments) — skipped at flow-arrow boundaries.
            if (style.showSegmentDividers && !this.hasFlowArrowAt(i, segments.length)) {
                const inner = polarToCartesian(this.cx, this.cy, innerLabelRadius, segStart);
                const outer = polarToCartesian(this.cx, this.cy, outerLabelRadius, segStart);
                dividers.push(`<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`);
            }
            this.emitSegmentLabelLines(defs, texts, pathId, segStart, segEnd, midAngle, textRadius, scaledFontSize, segment.name, flowShiftDeg, segment.subLabel, subFontSize);
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
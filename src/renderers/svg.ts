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

import type { DiagramConfig, Segment } from '../core/types.js';
import { validateConfig } from '../core/types.js';
import {
  polarToCartesian,
  segmentPath,
  facetAngles,
  scoreToRadius,
  ringRadii,
  segmentAngle,
} from '../core/geometry.js';

export class SVGRenderer {
  private config: DiagramConfig;
  private cx: number;
  private cy: number;
  private outerRadius: number;
  private padding = 70; // Extra space for labels outside the wheel

  constructor(config: DiagramConfig) {
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
  render(): string {
    const elements: string[] = [];

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

    // Flow arrows on top — opt-in via style.flowDirection.
    if (this.config.style.flowDirection) {
      elements.push(this.renderFlowArrows());
    }

    return this.wrapSVG(elements.join('\n'));
  }

  private wrapSVG(content: string): string {
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

  private renderBackground(): string {
    const viewSize = this.config.size + this.padding * 2;
    return `<rect x="${-this.padding}" y="${-this.padding}" width="${viewSize}" height="${viewSize}" fill="${this.config.style.backgroundColor}" />`;
  }

  private renderRings(): string {
    const { scale, center, style } = this.config;
    const rings = ringRadii(scale.rings, center.radius, this.outerRadius);
    const elements: string[] = [];

    const ringColor = style.ringColor || '#cccccc';
    const ringWidth = style.ringWidth || 1;
    const ringStyle = style.ringStyle || 'dashed';
    const dashArray = ringStyle === 'dashed' ? 'stroke-dasharray="4,4"' : '';

    // Draw ring circles
    rings.forEach((radius, i) => {
      if (i === 0) return; // Skip innermost (center hub boundary)
      elements.push(
        `<circle cx="${this.cx}" cy="${this.cy}" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="${ringWidth}" ${dashArray} />`
      );
    });

    return `<g class="rings">${elements.join('\n')}</g>`;
  }

  private renderScoreLabels(): string {
    const { scale, center, style } = this.config;
    const elements: string[] = [];

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
      elements.push(
        `<text x="${this.cx}" y="${y}" font-family="${style.fontFamily}" font-size="${fontSize}px" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3" paint-order="stroke">${label}</text>`
      );
    }

    return `<g class="score-labels">${elements.join('\n')}</g>`;
  }

  private renderSegmentBackgrounds(): string {
    const { segments, center, startAngle } = this.config;
    const segAngle = segmentAngle(segments.length);
    const elements: string[] = [];

    segments.forEach((segment, i) => {
      const sStart = startAngle + i * segAngle;
      const sEnd = sStart + segAngle;

      // Full segment background (lighter shade)
      const bgPath = segmentPath(
        this.cx,
        this.cy,
        center.radius,
        this.outerRadius,
        sStart,
        sEnd
      );
      elements.push(
        `<path d="${bgPath}" fill="${segment.color}" opacity="0.3" />`
      );
    });

    return `<g class="segment-backgrounds">${elements.join('\n')}</g>`;
  }

  private renderScoreFills(): string {
    const { segments, center, scale, startAngle, style } = this.config;
    const segAngle = segmentAngle(segments.length);
    const elements: string[] = [];

    segments.forEach((segment, segIndex) => {
      const segStart = startAngle + segIndex * segAngle;
      const segEnd = segStart + segAngle;
      const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);

      segment.facets.forEach((facet, facetIndex) => {
        if (facet.score === undefined || facet.score === null) return;

        const { startAngle: fStart, endAngle: fEnd } = facetAngleData[facetIndex];
        const scoreRadius = scoreToRadius(
          facet.score,
          scale.min,
          scale.max,
          center.radius,
          this.outerRadius
        );

        const fillPath = segmentPath(
          this.cx,
          this.cy,
          center.radius,
          scoreRadius,
          fStart,
          fEnd
        );

        elements.push(
          `<path d="${fillPath}" fill="${segment.color}" opacity="${style.facetOpacity}" />`
        );
      });
    });

    return `<g class="score-fills">${elements.join('\n')}</g>`;
  }

  private renderSegmentDividers(): string {
    const { segments, center, startAngle, style } = this.config;
    const segAngle = segmentAngle(segments.length);
    const elements: string[] = [];

    segments.forEach((_, i) => {
      const angle = startAngle + i * segAngle;
      const inner = polarToCartesian(this.cx, this.cy, center.radius, angle);
      const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, angle);

      elements.push(
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`
      );
    });

    return `<g class="segment-dividers">${elements.join('\n')}</g>`;
  }

  /**
   * Draw a small directional arrow on each segment-to-segment boundary,
   * indicating flow around the wheel. Wrap-around (last → first) is opt-in
   * via `style.flowCloseLoop`. Triggered by `style.flowDirection` being set.
   */
  private renderFlowArrows(): string {
    const { segments, startAngle, style } = this.config;
    const direction = style.flowDirection;
    if (!direction) return '';
    const segAngle = segmentAngle(segments.length);
    const arrowSize = style.flowArrowSize ?? 14;
    const arrowColor = style.flowArrowColor || style.segmentDividerColor || '#ffffff';
    // Sit just inside the outer wheel edge so the arrow is on the wheel.
    const arrowRadius = this.outerRadius - arrowSize * 0.6;
    const closeLoop = !!style.flowCloseLoop;
    const tipLen = arrowSize;
    const halfWidth = arrowSize * 0.5;

    const elements: string[] = [];
    // For n segments, there are n boundaries (i+1 mod n). Skip the last one
    // (the wrap from segment n-1 back to 0) unless closeLoop is on.
    for (let i = 0; i < segments.length; i++) {
      if (i === segments.length - 1 && !closeLoop) break;
      const boundaryAngle = startAngle + (i + 1) * segAngle;
      // Tangent in screen-coords with +y down: at angle θ, position is
      // (cos θ, sin θ); clockwise tangent is (-sin θ, cos θ).
      const rad = (boundaryAngle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const sign = direction === 'clockwise' ? 1 : -1;
      const tx = -sinA * sign;
      const ty =  cosA * sign;
      // Radial unit vector (outward).
      const rx = cosA;
      const ry = sinA;

      // Tip on the boundary, offset slightly along the flow direction so the
      // arrow sits ON the boundary rather than crossing it.
      const baseX = this.cx + arrowRadius * cosA;
      const baseY = this.cy + arrowRadius * sinA;
      const tipX  = baseX + tx * (tipLen * 0.5);
      const tipY  = baseY + ty * (tipLen * 0.5);
      const tailX = baseX - tx * (tipLen * 0.5);
      const tailY = baseY - ty * (tipLen * 0.5);
      const leftX  = tailX + rx * halfWidth;
      const leftY  = tailY + ry * halfWidth;
      const rightX = tailX - rx * halfWidth;
      const rightY = tailY - ry * halfWidth;

      elements.push(
        `<polygon points="${tipX.toFixed(2)},${tipY.toFixed(2)} ${leftX.toFixed(2)},${leftY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}" fill="${arrowColor}" />`
      );
    }

    return `<g class="flow-arrows">${elements.join('\n')}</g>`;
  }

  private renderFacetDividers(): string {
    const { segments, center, startAngle, style } = this.config;
    const segAngle = segmentAngle(segments.length);
    const elements: string[] = [];

    segments.forEach((segment, segIndex) => {
      const segStart = startAngle + segIndex * segAngle;
      const segEnd = segStart + segAngle;
      const facetAngleData = facetAngles(segStart, segEnd, segment.facets.length);

      // Draw dividers between facets (skip first one which is segment divider)
      facetAngleData.forEach((facet, facetIndex) => {
        if (facetIndex === 0) return; // First facet starts at segment boundary

        const inner = polarToCartesian(this.cx, this.cy, center.radius, facet.startAngle);
        const outer = polarToCartesian(this.cx, this.cy, this.outerRadius, facet.startAngle);

        elements.push(
          `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="1" opacity="0.5" />`
        );
      });

      // Draw facet points if enabled
      if (style.showFacetPoints && style.facetPointStyle !== 'none') {
        facetAngleData.forEach((facetData) => {
          const pointRadius = style.facetPointStyle === 'circle' ? 6 : 3;
          const arcRadius = this.outerRadius - 20; // Position points near outer edge

          const point = polarToCartesian(this.cx, this.cy, arcRadius, facetData.midAngle);

          elements.push(
            `<circle cx="${point.x}" cy="${point.y}" r="${pointRadius}" fill="white" stroke="${style.segmentDividerColor}" stroke-width="1" />`
          );
        });
      }
    });

    return `<g class="facet-dividers">${elements.join('\n')}</g>`;
  }

  private renderCenterHub(): string {
    const { center, style } = this.config;

    // Check if hub should be visible (default true)
    if (center.visible === false) {
      return '';
    }

    const elements: string[] = [];
    const borderWidth = center.borderWidth || 0;
    const borderColor = center.borderColor || '#ffffff';

    // Hub circle with optional border
    if (borderWidth > 0) {
      elements.push(
        `<circle cx="${this.cx}" cy="${this.cy}" r="${center.radius}" fill="${center.color}" stroke="${borderColor}" stroke-width="${borderWidth}" />`
      );
    } else {
      elements.push(
        `<circle cx="${this.cx}" cy="${this.cy}" r="${center.radius}" fill="${center.color}" />`
      );
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
      elements.push(
        `<text x="${this.cx}" y="${y}" class="center-label" style="font-size: ${scaledFontSize}px" dominant-baseline="middle">${safe}</text>`
      );
    });

    return `<g class="center-hub">${elements.join('\n')}</g>`;
  }

  private renderFacetLabels(): string {
    const { segments, center, startAngle } = this.config;
    const segAngle = segmentAngle(segments.length);
    const elements: string[] = [];
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
        let inner: string;
        if (lines.length === 1) {
          inner = safeName;
        } else {
          // Vertically centre the block: first line offset up by half the block height
          const firstDy = -((lines.length - 1) * 0.6);
          inner = lines
            .map((line, i) => {
              const dy = i === 0 ? `${firstDy}em` : '1.2em';
              return `<tspan x="${pos.x}" dy="${dy}">${line}</tspan>`;
            })
            .join('');
        }
        elements.push(
          `<text x="${pos.x}" y="${pos.y}" class="facet-label" text-anchor="${anchor}" dominant-baseline="middle" transform="rotate(${rotation}, ${pos.x}, ${pos.y})">${inner}</text>`
        );
      });
    });

    return `<g class="facet-labels">${elements.join('\n')}</g>`;
  }

  private renderSegmentLabels(): string {
    if ((this.config.style.segmentLabelPosition || 'outer') === 'inner') {
      return this.renderSegmentLabelsInner();
    }
    return this.renderSegmentLabelsOuter();
  }

  private renderSegmentLabelsInner(): string {
    const { segments, startAngle, style, center } = this.config;
    const segAngle = segmentAngle(segments.length);
    const defs: string[] = [];
    const backgrounds: string[] = [];
    const dividers: string[] = [];
    const texts: string[] = [];

    // Same band sizing as the outer mode (golden-ratio thickness), but anchored
    // to the centre hub edge instead of the outer wheel edge.
    const baseFontSize = style.segmentFontSize || 28;
    const phi = 1.618;
    const maxLines = Math.max(...segments.map((s) => s.name.split('\n').length));
    // Single-line band uses golden-ratio padding around the line.
    // Each extra line adds one line-height (1.2× fontSize).
    const arcThickness = (baseFontSize * phi) + baseFontSize + (maxLines - 1) * baseFontSize * 1.2;
    const dividerWidth = style.segmentDividerWidth || 4;

    const innerLabelRadius = center.radius + (dividerWidth / 2);
    const outerLabelRadius = innerLabelRadius + arcThickness;
    const textRadius = innerLabelRadius + (arcThickness / 2);

    const scaledFontSize = this.scaleSegmentFontSize(segments, segAngle, textRadius, baseFontSize);

    segments.forEach((segment, i) => {
      const segStart = startAngle + i * segAngle;
      const segEnd = segStart + segAngle;
      const midAngle = (segStart + segEnd) / 2;
      const pathId = `segment-path-${i}`;

      // Solid coloured arc band sitting on the wedge's inner edge
      const bgPath = segmentPath(
        this.cx, this.cy,
        innerLabelRadius, outerLabelRadius,
        segStart, segEnd
      );
      backgrounds.push(`<path d="${bgPath}" fill="${segment.labelColor || segment.color}" />`);

      // Radial dividers between segments along the band
      if (style.showSegmentDividers) {
        const inner = polarToCartesian(this.cx, this.cy, innerLabelRadius, segStart);
        const outer = polarToCartesian(this.cx, this.cy, outerLabelRadius, segStart);
        dividers.push(
          `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`
        );
      }

      this.emitSegmentLabelLines(defs, texts, pathId, segStart, segEnd, midAngle, textRadius, scaledFontSize, segment.name);
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
  private scaleSegmentFontSize(
    segments: Segment[],
    segAngle: number,
    textRadius: number,
    baseFontSize: number
  ): number {
    const arcLength = textRadius * (segAngle - 6) * (Math.PI / 180);
    const longestLineLength = Math.max(
      ...segments.flatMap((s) => s.name.split('\n').map((l) => l.length))
    );
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
  private emitSegmentLabelLines(
    defs: string[],
    texts: string[],
    pathIdBase: string,
    segStart: number,
    segEnd: number,
    midAngle: number,
    textRadius: number,
    fontSize: number,
    rawName: string
  ): void {
    const segAngle = segEnd - segStart;
    const safe = rawName.replace(/&/g, '&amp;');
    const lines = safe.split('\n');
    const lineHeight = fontSize * 1.2;
    const normalizedMid = ((midAngle % 360) + 360) % 360;
    const useClockwise = normalizedMid < 15 || normalizedMid > 165;
    // Top-half segments (clockwise arcs) read with the visually-first line at
    // the larger radius (outer edge); bottom-half segments (counter-clockwise
    // arcs) read with it at the smaller radius (closer to the hub).
    const sign = useClockwise ? -1 : 1;
    const largeArc = segAngle - 6 > 180 ? 1 : 0;

    lines.forEach((line, idx) => {
      const offset = sign * (idx - (lines.length - 1) / 2) * lineHeight;
      const lineRadius = textRadius + offset;
      const linePathId = `${pathIdBase}-${idx}`;

      if (useClockwise) {
        const s = polarToCartesian(this.cx, this.cy, lineRadius, segStart + 3);
        const e = polarToCartesian(this.cx, this.cy, lineRadius, segEnd - 3);
        defs.push(
          `<path id="${linePathId}" d="M ${s.x} ${s.y} A ${lineRadius} ${lineRadius} 0 ${largeArc} 1 ${e.x} ${e.y}" fill="none" />`
        );
      } else {
        const s = polarToCartesian(this.cx, this.cy, lineRadius, segEnd - 3);
        const e = polarToCartesian(this.cx, this.cy, lineRadius, segStart + 3);
        defs.push(
          `<path id="${linePathId}" d="M ${s.x} ${s.y} A ${lineRadius} ${lineRadius} 0 ${largeArc} 0 ${e.x} ${e.y}" fill="none" />`
        );
      }

      texts.push(
        `<text class="segment-label" fill="white" style="font-size: ${fontSize}px"><textPath href="#${linePathId}" startOffset="50%" text-anchor="middle">${line}</textPath></text>`
      );
    });
  }

  private renderSegmentLabelsOuter(): string {
    const { segments, startAngle, style } = this.config;
    const segAngle = segmentAngle(segments.length);
    const defs: string[] = [];
    const backgrounds: string[] = [];
    const dividers: string[] = [];
    const texts: string[] = [];

    // Calculate arc thickness using golden ratio: fontSize * phi + fontSize.
    // Each extra line of text adds one line-height (1.2× fontSize).
    const baseFontSize = style.segmentFontSize || 28;
    const phi = 1.618;
    const maxLines = Math.max(...segments.map((s) => s.name.split('\n').length));
    const arcThickness = (baseFontSize * phi) + baseFontSize + (maxLines - 1) * baseFontSize * 1.2;
    const dividerWidth = style.segmentDividerWidth || 4;

    // Position arc with divider gap, vertically center text
    const innerLabelRadius = this.outerRadius + (dividerWidth / 2);
    const outerLabelRadius = innerLabelRadius + arcThickness;
    const textRadius = innerLabelRadius + (arcThickness / 2); // Vertically centered

    const scaledFontSize = this.scaleSegmentFontSize(segments, segAngle, textRadius, baseFontSize);

    segments.forEach((segment, i) => {
      const segStart = startAngle + i * segAngle;
      const segEnd = segStart + segAngle;
      const midAngle = (segStart + segEnd) / 2;
      const pathId = `segment-path-${i}`;

      // Background arc segment
      const bgPath = segmentPath(
        this.cx, this.cy,
        innerLabelRadius, outerLabelRadius,
        segStart, segEnd
      );
      backgrounds.push(
        `<path d="${bgPath}" fill="${segment.labelColor || segment.color}" />`
      );

      // Segment divider line (same as main segments)
      if (style.showSegmentDividers) {
        const inner = polarToCartesian(this.cx, this.cy, innerLabelRadius, segStart);
        const outer = polarToCartesian(this.cx, this.cy, outerLabelRadius, segStart);
        dividers.push(
          `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${style.segmentDividerColor}" stroke-width="${style.segmentDividerWidth}" />`
        );
      }

      this.emitSegmentLabelLines(defs, texts, pathId, segStart, segEnd, midAngle, textRadius, scaledFontSize, segment.name);
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
export function renderDiagram(config: DiagramConfig): string {
  const renderer = new SVGRenderer(config);
  return renderer.render();
}

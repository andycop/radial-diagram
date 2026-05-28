"""
SVG renderer for radial diagrams.

Port of src/renderers/svg.ts. Method order and per-method output structure
mirror the TypeScript renderer so visual equivalence is achievable. Numeric
formatting differences between Python and JavaScript are absorbed by the
rasteriser at test time — see tests/shared/diff.py.
"""

from __future__ import annotations

import math
from typing import Any

from .geometry import (
    facet_angles,
    polar_to_cartesian,
    ring_radii,
    score_to_radius,
    segment_angle,
    segment_path,
)
from .types import (
    DiagramConfig,
    Segment,
    diagram_from_dict,
    validate_config,
)


def _fmt(n: float) -> str:
    """
    Format a number close to how JavaScript's `Number.prototype.toString()`
    renders it. Integer values lose their decimal point; otherwise we trim
    insignificant trailing zeros (e.g. 65.0 -> '65', 12.500 -> '12.5').

    We don't try for byte-identical output with JS — that's the rasteriser's
    job. But this keeps the SVG human-readable and close enough that text
    inspection diffs are usable while debugging.
    """
    if isinstance(n, bool):
        return "1" if n else "0"
    if isinstance(n, int):
        return str(n)
    if n == int(n):
        return str(int(n))
    # 12 sig figs is what JS uses for repr; trim trailing zeros after format
    s = f"{n:.12g}"
    return s


class SVGRenderer:
    """
    Render a DiagramConfig to a complete SVG document string.

    Mirrors SVGRenderer in src/renderers/svg.ts.
    """

    padding = 70

    def __init__(self, config: DiagramConfig | dict[str, Any]):
        if isinstance(config, dict):
            config = diagram_from_dict(config)
        validation = validate_config(config)
        if not validation.valid:
            joined = "\n- ".join(validation.errors)
            raise ValueError(f"Invalid diagram configuration:\n- {joined}")

        self.config = config
        self.cx = config.size / 2
        self.cy = config.size / 2
        self.outer_radius = (config.size / 2) * 0.9

    def render(self) -> str:
        style = self.config.style
        elements: list[str] = []

        if style.backgroundColor:
            elements.append(self._render_background())

        elements.append(self._render_segment_backgrounds())
        elements.append(self._render_score_fills())

        if style.showSegmentDividers:
            elements.append(self._render_segment_dividers())

        elements.append(self._render_facet_dividers())
        elements.append(self._render_center_hub())
        elements.append(self._render_facet_labels())
        elements.append(self._render_segment_labels())

        if style.showRings is not False:
            elements.append(self._render_rings())

        if style.showScoreLabels:
            elements.append(self._render_score_labels())

        if style.flowDirection:
            elements.append(self._render_flow_arrows())

        return self._wrap_svg("\n".join(elements))

    # ------------------------------------------------------------------ helpers

    def _wrap_svg(self, content: str) -> str:
        cfg = self.config
        style = cfg.style
        center = cfg.center
        view_size = cfg.size + self.padding * 2

        hub_font_size = center.fontSize or style.hubFontSize or 14
        hub_font_color = center.fontColor or style.hubFontColor or "#ffffff"
        segment_font_size = style.segmentFontSize or 28
        facet_font_size = style.facetFontSize or 11
        facet_font_color = style.facetFontColor or "#000000"
        font_family = style.fontFamily

        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox='
            f'"{-self.padding} {-self.padding} {_fmt(view_size)} {_fmt(view_size)}" '
            f'width="{_fmt(cfg.size)}" height="{_fmt(cfg.size)}">\n'
            f"  <style>\n"
            f"    .segment-label {{ font-family: {font_family}; font-weight: bold; "
            f"font-size: {_fmt(segment_font_size)}px; fill: white; "
            f"dominant-baseline: middle; }}\n"
            f"    .facet-label {{ font-family: {font_family}; "
            f"font-size: {_fmt(facet_font_size)}px; font-style: italic; "
            f"fill: {facet_font_color}; }}\n"
            f"    .center-label {{ font-family: {font_family}; font-weight: bold; "
            f"font-size: {_fmt(hub_font_size)}px; fill: {hub_font_color}; "
            f"text-anchor: middle; }}\n"
            f"    .ring-label {{ font-family: {font_family}; font-size: 10px; "
            f"fill: #666; }}\n"
            f"  </style>\n"
            f"  {content}\n"
            f"</svg>"
        )

    def _has_flow_arrow_at(self, boundary_index: int, total_segments: int) -> bool:
        """
        True when a flow arrow lives at the given segment boundary index.
        Boundary 0 is the wrap-around (last → first) and is opt-in via
        flowCloseLoop; boundaries 1..n-1 always carry an arrow when flow is on.
        """
        style = self.config.style
        if not style.flowDirection:
            return False
        if boundary_index == 0:
            return bool(style.flowCloseLoop)
        return 1 <= boundary_index < total_segments

    def _flow_label_shift_deg(
        self, band_mid: float, seg_angle_deg: float, arc_thickness: float
    ) -> float:
        style = self.config.style
        if not style.flowDirection:
            return 0
        arrow_size = (
            style.flowArrowSize if style.flowArrowSize is not None else arc_thickness
        )
        raw_angular = (arrow_size / band_mid) * (180 / math.pi)
        tip_angular_offset = min(raw_angular, seg_angle_deg * 0.3)
        sign = 1 if style.flowDirection == "clockwise" else -1
        return (tip_angular_offset / 2) * sign

    # ------------------------------------------------------------------ layers

    def _render_background(self) -> str:
        view_size = self.config.size + self.padding * 2
        return (
            f'<rect x="{-self.padding}" y="{-self.padding}" '
            f'width="{_fmt(view_size)}" height="{_fmt(view_size)}" '
            f'fill="{self.config.style.backgroundColor}" />'
        )

    def _render_rings(self) -> str:
        scale = self.config.scale
        center = self.config.center
        style = self.config.style
        rings = ring_radii(scale.rings, center.radius, self.outer_radius)
        ring_color = style.ringColor or "#cccccc"
        ring_width = style.ringWidth or 1
        ring_style = style.ringStyle or "dashed"
        dash_attr = 'stroke-dasharray="4,4"' if ring_style == "dashed" else ""

        out: list[str] = []
        for i, radius in enumerate(rings):
            if i == 0:
                continue  # innermost ring is the hub boundary
            out.append(
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(radius)}" fill="none" stroke="{ring_color}" '
                f'stroke-width="{_fmt(ring_width)}" {dash_attr} />'
            )

        return f'<g class="rings">{chr(10).join(out)}</g>'

    def _render_score_labels(self) -> str:
        scale = self.config.scale
        center = self.config.center
        style = self.config.style
        font_size = style.scoreLabelFontSize or 14
        fill_color = style.scoreLabelColor or "#ffffff"
        stroke_color = style.scoreLabelStrokeColor or "#333333"
        ring_step = (self.outer_radius - center.radius) / scale.rings

        out: list[str] = []
        for i in range(scale.rings):
            label = scale.min + i
            label_radius = center.radius + ((i + 0.5) * ring_step)
            y = self.cy - label_radius
            out.append(
                f'<text x="{_fmt(self.cx)}" y="{_fmt(y)}" '
                f'font-family="{style.fontFamily}" '
                f'font-size="{_fmt(font_size)}px" font-weight="bold" '
                f'text-anchor="middle" dominant-baseline="middle" '
                f'fill="{fill_color}" stroke="{stroke_color}" '
                f'stroke-width="3" paint-order="stroke">'
                f"{_fmt(label) if isinstance(label, (int, float)) else label}</text>"
            )

        return f'<g class="score-labels">{chr(10).join(out)}</g>'

    def _render_segment_backgrounds(self) -> str:
        segments = self.config.segments
        center = self.config.center
        start_angle = self.config.startAngle
        seg_angle = segment_angle(len(segments))

        out: list[str] = []
        for i, segment in enumerate(segments):
            s_start = start_angle + i * seg_angle
            s_end = s_start + seg_angle
            bg_path = segment_path(
                self.cx, self.cy, center.radius, self.outer_radius, s_start, s_end
            )
            out.append(f'<path d="{bg_path}" fill="{segment.color}" opacity="0.3" />')

        return f'<g class="segment-backgrounds">{chr(10).join(out)}</g>'

    def _render_score_fills(self) -> str:
        cfg = self.config
        segments = cfg.segments
        seg_angle = segment_angle(len(segments))
        out: list[str] = []

        for seg_index, segment in enumerate(segments):
            seg_start = cfg.startAngle + seg_index * seg_angle
            seg_end = seg_start + seg_angle
            facet_data = facet_angles(seg_start, seg_end, len(segment.facets))

            for facet_index, facet in enumerate(segment.facets):
                if facet.score is None:
                    continue
                f_start = facet_data[facet_index].startAngle
                f_end = facet_data[facet_index].endAngle
                score_radius = score_to_radius(
                    facet.score,
                    cfg.scale.min,
                    cfg.scale.max,
                    cfg.center.radius,
                    self.outer_radius,
                )
                fill_path = segment_path(
                    self.cx, self.cy, cfg.center.radius, score_radius, f_start, f_end
                )
                out.append(
                    f'<path d="{fill_path}" fill="{segment.color}" '
                    f'opacity="{_fmt(cfg.style.facetOpacity)}" />'
                )

        return f'<g class="score-fills">{chr(10).join(out)}</g>'

    def _render_segment_dividers(self) -> str:
        cfg = self.config
        segments = cfg.segments
        center = cfg.center
        style = cfg.style
        seg_angle = segment_angle(len(segments))
        out: list[str] = []

        for i in range(len(segments)):
            if self._has_flow_arrow_at(i, len(segments)):
                continue
            angle = cfg.startAngle + i * seg_angle
            inner = polar_to_cartesian(self.cx, self.cy, center.radius, angle)
            outer = polar_to_cartesian(self.cx, self.cy, self.outer_radius, angle)
            out.append(
                f'<line x1="{_fmt(inner.x)}" y1="{_fmt(inner.y)}" '
                f'x2="{_fmt(outer.x)}" y2="{_fmt(outer.y)}" '
                f'stroke="{style.segmentDividerColor}" '
                f'stroke-width="{_fmt(style.segmentDividerWidth)}" />'
            )

        return f'<g class="segment-dividers">{chr(10).join(out)}</g>'

    def _render_facet_dividers(self) -> str:
        cfg = self.config
        segments = cfg.segments
        center = cfg.center
        style = cfg.style
        seg_angle = segment_angle(len(segments))
        out: list[str] = []

        for seg_index, segment in enumerate(segments):
            seg_start = cfg.startAngle + seg_index * seg_angle
            seg_end = seg_start + seg_angle
            facet_data = facet_angles(seg_start, seg_end, len(segment.facets))

            for facet_index, fdata in enumerate(facet_data):
                if facet_index == 0:
                    continue
                inner = polar_to_cartesian(self.cx, self.cy, center.radius, fdata.startAngle)
                outer = polar_to_cartesian(self.cx, self.cy, self.outer_radius, fdata.startAngle)
                out.append(
                    f'<line x1="{_fmt(inner.x)}" y1="{_fmt(inner.y)}" '
                    f'x2="{_fmt(outer.x)}" y2="{_fmt(outer.y)}" '
                    f'stroke="{style.segmentDividerColor}" '
                    f'stroke-width="1" opacity="0.5" />'
                )

            if style.showFacetPoints and style.facetPointStyle != "none":
                for fdata in facet_data:
                    point_radius = 6 if style.facetPointStyle == "circle" else 3
                    arc_radius = self.outer_radius - 20
                    point = polar_to_cartesian(
                        self.cx, self.cy, arc_radius, fdata.midAngle
                    )
                    out.append(
                        f'<circle cx="{_fmt(point.x)}" cy="{_fmt(point.y)}" '
                        f'r="{_fmt(point_radius)}" fill="white" '
                        f'stroke="{style.segmentDividerColor}" stroke-width="1" />'
                    )

        return f'<g class="facet-dividers">{chr(10).join(out)}</g>'

    def _render_center_hub(self) -> str:
        center = self.config.center
        if center.visible is False:
            return ""

        out: list[str] = []
        border_width = center.borderWidth or 0
        border_color = center.borderColor or "#ffffff"

        if border_width > 0:
            out.append(
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(center.radius)}" fill="{center.color}" '
                f'stroke="{border_color}" stroke-width="{_fmt(border_width)}" />'
            )
        else:
            out.append(
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(center.radius)}" fill="{center.color}" />'
            )

        lines = [s.strip() for s in center.label.split("\n")]
        available_width = center.radius * 1.6
        max_line_length = max(len(line) for line in lines)
        scaled_font_size = math.floor(available_width / (max_line_length * 0.6))
        line_height = scaled_font_size * 1.2
        start_y = self.cy - ((len(lines) - 1) * line_height) / 2

        for i, line in enumerate(lines):
            safe = line.replace("&", "&amp;")
            y = start_y + i * line_height
            out.append(
                f'<text x="{_fmt(self.cx)}" y="{_fmt(y)}" class="center-label" '
                f'style="font-size: {_fmt(scaled_font_size)}px" '
                f'dominant-baseline="middle">{safe}</text>'
            )

        return f'<g class="center-hub">{chr(10).join(out)}</g>'

    def _render_facet_labels(self) -> str:
        cfg = self.config
        segments = cfg.segments
        seg_angle = segment_angle(len(segments))
        label_radius = self.outer_radius - 20
        out: list[str] = []

        for seg_index, segment in enumerate(segments):
            seg_start = cfg.startAngle + seg_index * seg_angle
            seg_end = seg_start + seg_angle
            seg_mid = (seg_start + seg_end) / 2
            facet_data = facet_angles(seg_start, seg_end, len(segment.facets))

            normalized_seg_mid = ((seg_mid % 360) + 360) % 360
            needs_flip = 90 < normalized_seg_mid <= 270
            rotation_offset = 180 if needs_flip else 0
            is_top_half = normalized_seg_mid <= 90 or normalized_seg_mid > 270
            anchor = "end" if is_top_half else "start"

            for facet_index, facet in enumerate(segment.facets):
                mid_angle = facet_data[facet_index].midAngle
                rotation = mid_angle + rotation_offset
                pos = polar_to_cartesian(self.cx, self.cy, label_radius, mid_angle)

                safe_name = facet.name.replace("&", "&amp;")
                lines = safe_name.split("\n")
                if len(lines) == 1:
                    inner = safe_name
                else:
                    first_dy = -((len(lines) - 1) * 0.6)
                    tspans = []
                    for i, line in enumerate(lines):
                        dy = f"{_fmt(first_dy)}em" if i == 0 else "1.2em"
                        tspans.append(f'<tspan x="{_fmt(pos.x)}" dy="{dy}">{line}</tspan>')
                    inner = "".join(tspans)

                out.append(
                    f'<text x="{_fmt(pos.x)}" y="{_fmt(pos.y)}" class="facet-label" '
                    f'text-anchor="{anchor}" dominant-baseline="middle" '
                    f'transform="rotate({_fmt(rotation)}, {_fmt(pos.x)}, {_fmt(pos.y)})">'
                    f"{inner}</text>"
                )

        return f'<g class="facet-labels">{chr(10).join(out)}</g>'

    def _render_segment_labels(self) -> str:
        position = self.config.style.segmentLabelPosition or "outer"
        if position == "inner":
            return self._render_segment_labels_inner()
        return self._render_segment_labels_outer()

    def _scale_segment_font_size(
        self,
        segments: list[Segment],
        seg_angle: float,
        text_radius: float,
        base_font_size: float,
    ) -> float:
        arc_length = text_radius * (seg_angle - 6) * (math.pi / 180)
        longest_line_length = max(
            len(line)
            for segment in segments
            for line in segment.name.split("\n")
        )
        est_text_width = (longest_line_length + 1) * base_font_size * 0.6
        if est_text_width > arc_length:
            return math.floor(base_font_size * (arc_length / est_text_width))
        return base_font_size

    def _emit_segment_label_lines(
        self,
        defs: list[str],
        texts: list[str],
        path_id_base: str,
        seg_start: float,
        seg_end: float,
        mid_angle: float,
        text_radius: float,
        font_size: float,
        raw_name: str,
        flow_shift_deg: float = 0,
    ) -> None:
        seg_angle = seg_end - seg_start
        safe = raw_name.replace("&", "&amp;")
        lines = safe.split("\n")
        line_height = font_size * 1.2
        normalized_mid = ((mid_angle % 360) + 360) % 360
        use_clockwise = normalized_mid < 15 or normalized_mid > 165
        sign = -1 if use_clockwise else 1
        large_arc = 1 if seg_angle - 6 > 180 else 0
        start_ang = seg_start + 3 + flow_shift_deg
        end_ang = seg_end - 3 + flow_shift_deg

        for idx, line in enumerate(lines):
            offset = sign * (idx - (len(lines) - 1) / 2) * line_height
            line_radius = text_radius + offset
            line_path_id = f"{path_id_base}-{idx}"

            if use_clockwise:
                s = polar_to_cartesian(self.cx, self.cy, line_radius, start_ang)
                e = polar_to_cartesian(self.cx, self.cy, line_radius, end_ang)
                defs.append(
                    f'<path id="{line_path_id}" d="M {_fmt(s.x)} {_fmt(s.y)} '
                    f'A {_fmt(line_radius)} {_fmt(line_radius)} 0 {large_arc} 1 '
                    f'{_fmt(e.x)} {_fmt(e.y)}" fill="none" />'
                )
            else:
                s = polar_to_cartesian(self.cx, self.cy, line_radius, end_ang)
                e = polar_to_cartesian(self.cx, self.cy, line_radius, start_ang)
                defs.append(
                    f'<path id="{line_path_id}" d="M {_fmt(s.x)} {_fmt(s.y)} '
                    f'A {_fmt(line_radius)} {_fmt(line_radius)} 0 {large_arc} 0 '
                    f'{_fmt(e.x)} {_fmt(e.y)}" fill="none" />'
                )

            texts.append(
                f'<text class="segment-label" fill="white" '
                f'style="font-size: {_fmt(font_size)}px">'
                f'<textPath href="#{line_path_id}" startOffset="50%" '
                f'text-anchor="middle">{line}</textPath></text>'
            )

    def _render_segment_labels_inner(self) -> str:
        cfg = self.config
        segments = cfg.segments
        style = cfg.style
        center = cfg.center
        seg_angle = segment_angle(len(segments))
        defs: list[str] = []
        backgrounds: list[str] = []
        dividers: list[str] = []
        texts: list[str] = []

        base_font_size = style.segmentFontSize or 28
        phi = 1.618
        max_lines = max(len(s.name.split("\n")) for s in segments)
        arc_thickness = (
            (base_font_size * phi)
            + base_font_size
            + (max_lines - 1) * base_font_size * 1.2
        )
        divider_width = style.segmentDividerWidth or 4

        inner_label_radius = center.radius + (divider_width / 2)
        outer_label_radius = inner_label_radius + arc_thickness
        text_radius = inner_label_radius + (arc_thickness / 2)

        scaled_font_size = self._scale_segment_font_size(
            segments, seg_angle, text_radius, base_font_size
        )
        flow_shift_deg = self._flow_label_shift_deg(text_radius, seg_angle, arc_thickness)

        for i, segment in enumerate(segments):
            seg_start = cfg.startAngle + i * seg_angle
            seg_end = seg_start + seg_angle
            mid_angle = (seg_start + seg_end) / 2
            path_id = f"segment-path-{i}"

            bg_path = segment_path(
                self.cx, self.cy, inner_label_radius, outer_label_radius, seg_start, seg_end
            )
            backgrounds.append(
                f'<path d="{bg_path}" fill="{segment.labelColor or segment.color}" />'
            )

            if style.showSegmentDividers and not self._has_flow_arrow_at(i, len(segments)):
                inner = polar_to_cartesian(self.cx, self.cy, inner_label_radius, seg_start)
                outer = polar_to_cartesian(self.cx, self.cy, outer_label_radius, seg_start)
                dividers.append(
                    f'<line x1="{_fmt(inner.x)}" y1="{_fmt(inner.y)}" '
                    f'x2="{_fmt(outer.x)}" y2="{_fmt(outer.y)}" '
                    f'stroke="{style.segmentDividerColor}" '
                    f'stroke-width="{_fmt(style.segmentDividerWidth)}" />'
                )

            self._emit_segment_label_lines(
                defs, texts, path_id, seg_start, seg_end, mid_angle,
                text_radius, scaled_font_size, segment.name, flow_shift_deg,
            )

        if style.showSegmentDividers:
            ring_dividers = "\n".join([
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(inner_label_radius)}" fill="none" '
                f'stroke="{style.segmentDividerColor}" stroke-width="{_fmt(divider_width)}" />',
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(outer_label_radius)}" fill="none" '
                f'stroke="{style.segmentDividerColor}" stroke-width="{_fmt(divider_width)}" />',
            ])
        else:
            ring_dividers = ""

        return (
            f'<defs>{chr(10).join(defs)}</defs>\n'
            f'<g class="segment-label-backgrounds">{chr(10).join(backgrounds)}</g>\n'
            f"{ring_dividers}\n"
            f'<g class="segment-label-dividers">{chr(10).join(dividers)}</g>\n'
            f'<g class="segment-labels">{chr(10).join(texts)}</g>'
        )

    def _render_segment_labels_outer(self) -> str:
        cfg = self.config
        segments = cfg.segments
        style = cfg.style
        seg_angle = segment_angle(len(segments))
        defs: list[str] = []
        backgrounds: list[str] = []
        dividers: list[str] = []
        texts: list[str] = []

        base_font_size = style.segmentFontSize or 28
        phi = 1.618
        max_lines = max(len(s.name.split("\n")) for s in segments)
        arc_thickness = (
            (base_font_size * phi)
            + base_font_size
            + (max_lines - 1) * base_font_size * 1.2
        )
        divider_width = style.segmentDividerWidth or 4

        inner_label_radius = self.outer_radius + (divider_width / 2)
        outer_label_radius = inner_label_radius + arc_thickness
        text_radius = inner_label_radius + (arc_thickness / 2)

        scaled_font_size = self._scale_segment_font_size(
            segments, seg_angle, text_radius, base_font_size
        )
        flow_shift_deg = self._flow_label_shift_deg(text_radius, seg_angle, arc_thickness)

        for i, segment in enumerate(segments):
            seg_start = cfg.startAngle + i * seg_angle
            seg_end = seg_start + seg_angle
            mid_angle = (seg_start + seg_end) / 2
            path_id = f"segment-path-{i}"

            bg_path = segment_path(
                self.cx, self.cy, inner_label_radius, outer_label_radius, seg_start, seg_end
            )
            backgrounds.append(
                f'<path d="{bg_path}" fill="{segment.labelColor or segment.color}" />'
            )

            if style.showSegmentDividers and not self._has_flow_arrow_at(i, len(segments)):
                inner = polar_to_cartesian(self.cx, self.cy, inner_label_radius, seg_start)
                outer = polar_to_cartesian(self.cx, self.cy, outer_label_radius, seg_start)
                dividers.append(
                    f'<line x1="{_fmt(inner.x)}" y1="{_fmt(inner.y)}" '
                    f'x2="{_fmt(outer.x)}" y2="{_fmt(outer.y)}" '
                    f'stroke="{style.segmentDividerColor}" '
                    f'stroke-width="{_fmt(style.segmentDividerWidth)}" />'
                )

            self._emit_segment_label_lines(
                defs, texts, path_id, seg_start, seg_end, mid_angle,
                text_radius, scaled_font_size, segment.name, flow_shift_deg,
            )

        if style.showSegmentDividers:
            ring_divider = (
                f'<circle cx="{_fmt(self.cx)}" cy="{_fmt(self.cy)}" '
                f'r="{_fmt(self.outer_radius)}" fill="none" '
                f'stroke="{style.segmentDividerColor}" stroke-width="{_fmt(divider_width)}" />'
            )
        else:
            ring_divider = ""

        return (
            f'<defs>{chr(10).join(defs)}</defs>\n'
            f"{ring_divider}\n"
            f'<g class="segment-label-backgrounds">{chr(10).join(backgrounds)}</g>\n'
            f'<g class="segment-label-dividers">{chr(10).join(dividers)}</g>\n'
            f'<g class="segment-labels">{chr(10).join(texts)}</g>'
        )

    def _render_flow_arrows(self) -> str:
        cfg = self.config
        segments = cfg.segments
        style = cfg.style
        center = cfg.center
        direction = style.flowDirection
        if not direction:
            return ""
        seg_angle_deg = segment_angle(len(segments))

        label_position = style.segmentLabelPosition or "outer"
        base_font_size = style.segmentFontSize or 28
        phi = 1.618
        max_lines = max(len(s.name.split("\n")) for s in segments)
        arc_thickness = (
            (base_font_size * phi)
            + base_font_size
            + (max_lines - 1) * base_font_size * 1.2
        )
        divider_width = style.segmentDividerWidth or 4

        if label_position == "outer":
            band_inner = self.outer_radius + divider_width / 2
        else:
            band_inner = center.radius + divider_width / 2
        band_outer = band_inner + arc_thickness
        band_mid = (band_inner + band_outer) / 2

        arrow_size = (
            style.flowArrowSize if style.flowArrowSize is not None else arc_thickness
        )
        raw_angular = (arrow_size / band_mid) * (180 / math.pi)
        tip_angular_offset = min(raw_angular, seg_angle_deg * 0.3)

        close_loop = bool(style.flowCloseLoop)
        stroke = style.segmentDividerColor or "#ffffff"
        sign = 1 if direction == "clockwise" else -1

        out: list[str] = []
        for i, source_seg in enumerate(segments):
            if i == len(segments) - 1 and not close_loop:
                break
            fill = (
                style.flowArrowColor
                or source_seg.labelColor
                or source_seg.color
            )

            boundary_angle = cfg.startAngle + (i + 1) * seg_angle_deg
            tip_angle = boundary_angle + tip_angular_offset * sign

            tip = polar_to_cartesian(self.cx, self.cy, band_mid, tip_angle)
            base_inner = polar_to_cartesian(self.cx, self.cy, band_inner, boundary_angle)
            base_outer = polar_to_cartesian(self.cx, self.cy, band_outer, boundary_angle)

            out.append(
                f'<polygon points="{tip.x:.2f},{tip.y:.2f} '
                f'{base_inner.x:.2f},{base_inner.y:.2f} '
                f'{base_outer.x:.2f},{base_outer.y:.2f}" fill="{fill}" />'
            )
            out.append(
                f'<polyline points="{base_inner.x:.2f},{base_inner.y:.2f} '
                f'{tip.x:.2f},{tip.y:.2f} '
                f'{base_outer.x:.2f},{base_outer.y:.2f}" fill="none" '
                f'stroke="{stroke}" stroke-width="{_fmt(divider_width)}" '
                f'stroke-linejoin="round" />'
            )

        return f'<g class="flow-arrows">{chr(10).join(out)}</g>'


def render_diagram(config: DiagramConfig | dict[str, Any]) -> str:
    """Convenience function: validate config and return the rendered SVG string."""
    return SVGRenderer(config).render()

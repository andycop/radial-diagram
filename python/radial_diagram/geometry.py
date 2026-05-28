"""
Geometry utilities for circular diagram calculations.

1:1 port of src/core/geometry.ts. All functions are pure.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal


@dataclass
class Point:
    x: float
    y: float


@dataclass
class FacetAngle:
    startAngle: float
    endAngle: float
    midAngle: float


@dataclass
class LabelOrientation:
    textAnchor: Literal["start", "middle", "end"]
    rotation: float
    alignmentBaseline: str


def polar_to_cartesian(
    cx: float, cy: float, radius: float, angle_degrees: float
) -> Point:
    angle_radians = (angle_degrees * math.pi) / 180
    return Point(
        x=cx + radius * math.cos(angle_radians),
        y=cy + radius * math.sin(angle_radians),
    )


def describe_arc(
    cx: float,
    cy: float,
    radius: float,
    start_angle: float,
    end_angle: float,
) -> str:
    start = polar_to_cartesian(cx, cy, radius, start_angle)
    end = polar_to_cartesian(cx, cy, radius, end_angle)

    angle_diff = end_angle - start_angle
    large_arc_flag = 1 if abs(angle_diff) > 180 else 0
    sweep_flag = 1 if angle_diff > 0 else 0

    return (
        f"M {start.x} {start.y} A {radius} {radius} 0 "
        f"{large_arc_flag} {sweep_flag} {end.x} {end.y}"
    )


def segment_path(
    cx: float,
    cy: float,
    inner_radius: float,
    outer_radius: float,
    start_angle: float,
    end_angle: float,
) -> str:
    outer_start = polar_to_cartesian(cx, cy, outer_radius, start_angle)
    outer_end = polar_to_cartesian(cx, cy, outer_radius, end_angle)
    inner_start = polar_to_cartesian(cx, cy, inner_radius, start_angle)
    inner_end = polar_to_cartesian(cx, cy, inner_radius, end_angle)

    angle_diff = end_angle - start_angle
    large_arc_flag = 1 if abs(angle_diff) > 180 else 0

    if inner_radius == 0:
        return " ".join(
            [
                f"M {cx} {cy}",
                f"L {outer_start.x} {outer_start.y}",
                f"A {outer_radius} {outer_radius} 0 {large_arc_flag} 1 "
                f"{outer_end.x} {outer_end.y}",
                "Z",
            ]
        )

    return " ".join(
        [
            f"M {outer_start.x} {outer_start.y}",
            f"A {outer_radius} {outer_radius} 0 {large_arc_flag} 1 "
            f"{outer_end.x} {outer_end.y}",
            f"L {inner_end.x} {inner_end.y}",
            f"A {inner_radius} {inner_radius} 0 {large_arc_flag} 0 "
            f"{inner_start.x} {inner_start.y}",
            "Z",
        ]
    )


def facet_score_path(
    cx: float,
    cy: float,
    inner_radius: float,
    outer_radius: float,
    start_angle: float,
    end_angle: float,
) -> str:
    return segment_path(cx, cy, inner_radius, outer_radius, start_angle, end_angle)


def segment_angle(segment_count: int) -> float:
    if segment_count <= 0:
        raise ValueError("segmentCount must be greater than 0")
    return 360 / segment_count


def facet_angles(
    segment_start_angle: float,
    segment_end_angle: float,
    facet_count: int,
) -> list[FacetAngle]:
    if facet_count <= 0:
        raise ValueError("facetCount must be greater than 0")
    total_angle = segment_end_angle - segment_start_angle
    facet_angle_span = total_angle / facet_count

    result: list[FacetAngle] = []
    for i in range(facet_count):
        start_angle = segment_start_angle + i * facet_angle_span
        end_angle = start_angle + facet_angle_span
        mid_angle = (start_angle + end_angle) / 2
        result.append(
            FacetAngle(startAngle=start_angle, endAngle=end_angle, midAngle=mid_angle)
        )
    return result


def score_to_radius(
    score: float,
    min_score: float,
    max_score: float,
    inner_radius: float,
    outer_radius: float,
) -> float:
    if min_score > max_score:
        raise ValueError("minScore must be less than or equal to maxScore")
    if inner_radius >= outer_radius:
        raise ValueError("innerRadius must be less than outerRadius")
    if min_score == max_score:
        return outer_radius
    clamped_score = max(min_score, min(max_score, score))
    levels = max_score - min_score + 1
    radius_range = outer_radius - inner_radius
    normalized_score = (clamped_score - min_score + 1) / levels
    return inner_radius + normalized_score * radius_range


def ring_radii(
    ring_count: int, inner_radius: float, outer_radius: float
) -> list[float]:
    if ring_count <= 0:
        raise ValueError("ringCount must be greater than 0")
    if inner_radius >= outer_radius:
        raise ValueError("innerRadius must be less than outerRadius")
    step = (outer_radius - inner_radius) / ring_count
    return [inner_radius + i * step for i in range(ring_count + 1)]


def label_orientation(angle: float) -> LabelOrientation:
    normalized_angle = ((angle % 360) + 360) % 360

    text_anchor: Literal["start", "middle", "end"] = "middle"
    rotation = normalized_angle + 90
    alignment_baseline = "middle"

    if 90 < normalized_angle < 270:
        rotation += 180

    if normalized_angle >= 350 or normalized_angle <= 10:
        text_anchor = "start"
        alignment_baseline = "middle"
    elif 170 <= normalized_angle <= 190:
        text_anchor = "end"
        alignment_baseline = "middle"

    return LabelOrientation(
        textAnchor=text_anchor,
        rotation=rotation,
        alignmentBaseline=alignment_baseline,
    )

"""Mirrors src/core/geometry.test.ts."""

import math

import pytest

from radial_diagram.geometry import (
    describe_arc,
    facet_angles,
    label_orientation,
    polar_to_cartesian,
    ring_radii,
    score_to_radius,
    segment_angle,
    segment_path,
)


class TestPolarToCartesian:
    def test_zero_degrees_right(self):
        p = polar_to_cartesian(100, 100, 50, 0)
        assert p.x == pytest.approx(150)
        assert p.y == pytest.approx(100)

    def test_ninety_degrees_down(self):
        p = polar_to_cartesian(100, 100, 50, 90)
        assert p.x == pytest.approx(100)
        assert p.y == pytest.approx(150)

    def test_one_eighty_degrees_left(self):
        p = polar_to_cartesian(100, 100, 50, 180)
        assert p.x == pytest.approx(50)
        assert p.y == pytest.approx(100)

    def test_minus_ninety_degrees_up(self):
        p = polar_to_cartesian(100, 100, 50, -90)
        assert p.x == pytest.approx(100)
        assert p.y == pytest.approx(50)


class TestSegmentAngle:
    def test_four_segments(self):
        assert segment_angle(4) == 90

    def test_six_segments(self):
        assert segment_angle(6) == 60

    def test_zero_segments_raises(self):
        with pytest.raises(ValueError, match="segmentCount must be greater than 0"):
            segment_angle(0)

    def test_negative_segments_raises(self):
        with pytest.raises(ValueError, match="segmentCount must be greater than 0"):
            segment_angle(-1)


class TestFacetAngles:
    def test_three_facets_in_ninety_degree_segment(self):
        angles = facet_angles(0, 90, 3)
        assert len(angles) == 3
        assert angles[0].startAngle == 0
        assert angles[0].endAngle == 30
        assert angles[0].midAngle == 15
        assert angles[2].endAngle == 90

    def test_zero_facets_raises(self):
        with pytest.raises(ValueError, match="facetCount must be greater than 0"):
            facet_angles(0, 90, 0)


class TestScoreToRadius:
    def test_min_score_to_inner(self):
        r = score_to_radius(1, 1, 5, 50, 150)
        assert r == pytest.approx(70)  # 50 + (1/5 * 100)

    def test_max_score_to_outer(self):
        r = score_to_radius(5, 1, 5, 50, 150)
        assert r == pytest.approx(150)

    def test_clamps_below_min(self):
        r = score_to_radius(0, 1, 5, 50, 150)
        assert r == pytest.approx(70)

    def test_clamps_above_max(self):
        r = score_to_radius(10, 1, 5, 50, 150)
        assert r == pytest.approx(150)

    def test_equal_min_max_flat_scale(self):
        assert score_to_radius(3, 3, 3, 50, 150) == 150

    def test_invalid_scale_raises(self):
        with pytest.raises(ValueError, match="minScore must be less than or equal to maxScore"):
            score_to_radius(3, 5, 1, 50, 150)

    def test_invalid_radii_raises(self):
        with pytest.raises(ValueError, match="innerRadius must be less than outerRadius"):
            score_to_radius(3, 1, 5, 150, 50)


class TestRingRadii:
    def test_five_rings(self):
        radii = ring_radii(5, 50, 150)
        assert len(radii) == 6
        assert radii[0] == 50
        assert radii[5] == 150
        assert radii[1] == pytest.approx(70)

    def test_zero_rings_raises(self):
        with pytest.raises(ValueError, match="ringCount must be greater than 0"):
            ring_radii(0, 50, 150)

    def test_invalid_radii_raises(self):
        with pytest.raises(ValueError, match="innerRadius must be less than outerRadius"):
            ring_radii(5, 150, 50)


class TestDescribeArc:
    def test_generates_valid_arc(self):
        path = describe_arc(100, 100, 50, 0, 90)
        assert "M" in path
        assert "A" in path


class TestSegmentPath:
    def test_pie_slice_when_inner_zero(self):
        path = segment_path(100, 100, 0, 50, 0, 90)
        assert "M 100 100" in path
        assert "Z" in path

    def test_ring_segment_when_inner_positive(self):
        path = segment_path(100, 100, 30, 50, 0, 90)
        assert "M 100 100" not in path
        assert "Z" in path


class TestLabelOrientation:
    def test_right_side(self):
        o = label_orientation(0)
        assert o.textAnchor in {"start", "middle", "end"}
        assert isinstance(o.rotation, (int, float))

    def test_normalises_angles_above_360(self):
        a = label_orientation(45)
        b = label_orientation(405)
        assert (a.rotation % 360) == pytest.approx(b.rotation % 360)

    def test_normalises_negative_angles(self):
        o = label_orientation(-90)
        assert o.textAnchor in {"start", "middle", "end"}

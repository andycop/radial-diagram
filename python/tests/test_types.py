"""Mirrors src/core/types.test.ts."""

import copy
from dataclasses import replace

import pytest

from radial_diagram.types import (
    DEFAULT_SCALE,
    DEFAULT_STYLE,
    CenterConfig,
    DiagramConfig,
    Facet,
    ScaleConfig,
    Segment,
    create_config,
    validate_config,
)


def _valid_config() -> DiagramConfig:
    return DiagramConfig(
        size=800,
        startAngle=-90,
        center=CenterConfig(label="Test", radius=100, color="#333333"),
        scale=ScaleConfig(min=1, max=5, rings=5),
        segments=[
            Segment(
                name="Segment 1",
                color="#ff0000",
                facets=[Facet(name="Facet 1", score=3)],
            )
        ],
        style=copy.deepcopy(DEFAULT_STYLE),
    )


class TestValidateConfig:
    def test_accepts_valid(self):
        result = validate_config(_valid_config())
        assert result.valid is True
        assert result.errors == []

    def test_rejects_zero_size(self):
        cfg = _valid_config()
        cfg.size = 0
        result = validate_config(cfg)
        assert result.valid is False
        assert "size must be greater than 0" in result.errors

    def test_rejects_negative_size(self):
        cfg = _valid_config()
        cfg.size = -100
        assert validate_config(cfg).valid is False

    def test_rejects_missing_center(self):
        cfg = _valid_config()
        cfg.center = None  # type: ignore[assignment]
        result = validate_config(cfg)
        assert result.valid is False
        assert "center configuration is required" in result.errors

    def test_rejects_zero_center_radius(self):
        cfg = _valid_config()
        cfg.center = replace(cfg.center, radius=0)
        result = validate_config(cfg)
        assert result.valid is False
        assert "center.radius must be greater than 0" in result.errors

    def test_rejects_missing_scale(self):
        cfg = _valid_config()
        cfg.scale = None  # type: ignore[assignment]
        result = validate_config(cfg)
        assert result.valid is False
        assert "scale configuration is required" in result.errors

    def test_rejects_min_gt_max(self):
        cfg = _valid_config()
        cfg.scale = ScaleConfig(min=5, max=1, rings=5)
        result = validate_config(cfg)
        assert result.valid is False
        assert "scale.min must be less than or equal to scale.max" in result.errors

    def test_rejects_zero_rings(self):
        cfg = _valid_config()
        cfg.scale = ScaleConfig(min=1, max=5, rings=0)
        result = validate_config(cfg)
        assert result.valid is False
        assert "scale.rings must be greater than 0" in result.errors

    def test_rejects_empty_segments(self):
        cfg = _valid_config()
        cfg.segments = []
        result = validate_config(cfg)
        assert result.valid is False
        assert "segments array must contain at least one segment" in result.errors

    def test_rejects_segment_with_empty_facets(self):
        cfg = _valid_config()
        cfg.segments = [Segment(name="Empty", color="#000", facets=[])]
        result = validate_config(cfg)
        assert result.valid is False
        assert "must contain at least one facet" in result.errors[0]

    def test_rejects_facet_score_out_of_range(self):
        cfg = _valid_config()
        cfg.segments = [
            Segment(
                name="Seg", color="#000", facets=[Facet(name="Facet", score=10)]
            )
        ]
        result = validate_config(cfg)
        assert result.valid is False
        assert "must be between" in result.errors[0]

    def test_allows_facet_without_score(self):
        cfg = _valid_config()
        cfg.segments = [
            Segment(name="Seg", color="#000", facets=[Facet(name="Facet")])
        ]
        assert validate_config(cfg).valid is True

    def test_rejects_center_radius_ge_outer(self):
        cfg = _valid_config()
        cfg.size = 200
        cfg.center = replace(cfg.center, radius=100)  # outer would be 90
        result = validate_config(cfg)
        assert result.valid is False
        assert "center.radius" in result.errors[0]


class TestCreateConfig:
    def test_fills_in_defaults(self):
        cfg = create_config({})
        assert cfg.size == 800
        assert cfg.startAngle == -90
        assert cfg.center.label == "Core"
        assert cfg.scale.min == DEFAULT_SCALE.min
        assert cfg.scale.max == DEFAULT_SCALE.max
        assert cfg.scale.rings == DEFAULT_SCALE.rings
        assert cfg.style.fontFamily == DEFAULT_STYLE.fontFamily

    def test_preserves_provided_values(self):
        cfg = create_config(
            {
                "size": 600,
                "startAngle": 0,
                "center": {"label": "Custom", "radius": 80, "color": "#123456"},
            }
        )
        assert cfg.size == 600
        assert cfg.startAngle == 0
        assert cfg.center.label == "Custom"
        assert cfg.center.radius == 80

    def test_merges_partial_style_with_defaults(self):
        cfg = create_config({"style": {"facetOpacity": 0.5}})
        assert cfg.style.facetOpacity == 0.5
        assert cfg.style.fontFamily == DEFAULT_STYLE.fontFamily


class TestDefaults:
    def test_default_style_shape(self):
        assert DEFAULT_STYLE.showRings is True
        assert DEFAULT_STYLE.ringColor == "#cccccc"
        assert DEFAULT_STYLE.fontFamily == "Arial, sans-serif"
        assert DEFAULT_STYLE.facetOpacity == 1

    def test_default_scale_shape(self):
        assert DEFAULT_SCALE.min == 1
        assert DEFAULT_SCALE.max == 5
        assert DEFAULT_SCALE.rings == 5

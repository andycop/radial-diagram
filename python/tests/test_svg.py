"""Mirrors src/renderers/svg.test.ts."""

import copy
from dataclasses import replace

import pytest

from radial_diagram.svg import SVGRenderer, render_diagram
from radial_diagram.types import (
    DEFAULT_SCALE,
    DEFAULT_STYLE,
    CenterConfig,
    DiagramConfig,
    Facet,
    Segment,
    StyleConfig,
)


def _valid_config() -> DiagramConfig:
    return DiagramConfig(
        size=800,
        startAngle=-90,
        center=CenterConfig(label="Test Hub", radius=100, color="#702082"),
        scale=copy.deepcopy(DEFAULT_SCALE),
        segments=[
            Segment(
                name="Segment One",
                color="#E6A817",
                facets=[
                    Facet(name="Facet A", score=3),
                    Facet(name="Facet B", score=4),
                ],
            ),
            Segment(
                name="Segment Two",
                color="#C41E3A",
                facets=[Facet(name="Facet C", score=2)],
            ),
        ],
        style=copy.deepcopy(DEFAULT_STYLE),
    )


class TestSVGRenderer:
    def test_constructs_with_valid_config(self):
        assert isinstance(SVGRenderer(_valid_config()), SVGRenderer)

    def test_raises_on_invalid_config(self):
        cfg = _valid_config()
        cfg.size = 0
        with pytest.raises(ValueError, match="Invalid diagram configuration"):
            SVGRenderer(cfg)

    def test_renders_valid_svg(self):
        svg = SVGRenderer(_valid_config()).render()
        assert "<svg" in svg
        assert "</svg>" in svg
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg

    def test_includes_segment_labels(self):
        svg = SVGRenderer(_valid_config()).render()
        assert "Segment One" in svg
        assert "Segment Two" in svg

    def test_includes_facet_labels(self):
        svg = SVGRenderer(_valid_config()).render()
        assert "Facet A" in svg
        assert "Facet B" in svg
        assert "Facet C" in svg

    def test_includes_center_label(self):
        svg = SVGRenderer(_valid_config()).render()
        assert "Test Hub" in svg

    def test_escapes_ampersand_in_labels(self):
        cfg = _valid_config()
        cfg.center = replace(cfg.center, label="Test & Hub")
        svg = SVGRenderer(cfg).render()
        assert "&amp;" in svg
        assert "Test & Hub" not in svg

    def test_hides_center_when_visible_false(self):
        cfg = _valid_config()
        cfg.center = replace(cfg.center, visible=False)
        svg = SVGRenderer(cfg).render()
        assert 'class="center-hub"' not in svg

    def test_renders_background_when_specified(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, backgroundColor="#f0f0f0")
        svg = SVGRenderer(cfg).render()
        assert 'fill="#f0f0f0"' in svg

    def test_hides_rings_when_disabled(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, showRings=False)
        svg = SVGRenderer(cfg).render()
        assert 'class="rings"' not in svg

    def test_shows_score_labels_when_enabled(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, showScoreLabels=True)
        svg = SVGRenderer(cfg).render()
        assert 'class="score-labels"' in svg

    def test_hides_segment_dividers_when_disabled(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, showSegmentDividers=False)
        svg = SVGRenderer(cfg).render()
        assert 'class="segment-dividers"' not in svg

    def test_handles_facets_without_scores(self):
        cfg = _valid_config()
        cfg.segments = [
            Segment(name="Seg", color="#000", facets=[Facet(name="No Score Facet")])
        ]
        svg = SVGRenderer(cfg).render()
        assert "No Score Facet" in svg

    def test_applies_center_border_when_specified(self):
        cfg = _valid_config()
        cfg.center = replace(cfg.center, borderWidth=4, borderColor="#ffffff")
        svg = SVGRenderer(cfg).render()
        assert 'stroke="#ffffff"' in svg
        assert 'stroke-width="4"' in svg


class TestWheelRedesignOptions:
    """Mirrors the 'wheel-redesign options (2b)' block in svg.test.ts."""

    def test_default_track_opacity_is_0_3(self):
        svg = SVGRenderer(_valid_config()).render()
        assert 'opacity="0.3"' in svg

    def test_configurable_track_opacity(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, trackOpacity=0.12)
        svg = SVGRenderer(cfg).render()
        assert 'opacity="0.12"' in svg

    def test_segment_sub_label_is_rendered(self):
        cfg = _valid_config()
        cfg.segments = [replace(s, subLabel=f"{i}9%") for i, s in enumerate(cfg.segments)]
        svg = SVGRenderer(cfg).render()
        assert ">09%</textPath>" in svg
        assert "font-weight: normal" in svg

    def test_no_figures_layer_without_figures(self):
        svg = SVGRenderer(_valid_config()).render()
        assert 'class="facet-figures"' not in svg

    def test_facet_figures_have_no_background(self):
        cfg = _valid_config()
        cfg.segments = [
            Segment(name="Seg", color="#702082", facets=[Facet(name="A", score=3, figure="74%")])
        ]
        svg = SVGRenderer(cfg).render()
        assert 'class="facet-figures"' in svg
        assert ">74%</text>" in svg

    def test_outer_edge_facet_labels_uppercase_and_wrap(self):
        cfg = _valid_config()
        cfg.style = replace(cfg.style, facetLabelPlacement="outer-edge")
        cfg.segments = [
            Segment(
                name="Seg",
                color="#702082",
                facets=[Facet(name="Direction & Purpose", score=3)],
            )
        ]
        svg = SVGRenderer(cfg).render()
        assert "DIRECTION &amp;</tspan>" in svg
        assert "PURPOSE</tspan>" in svg


class TestRenderDiagram:
    def test_returns_svg(self):
        svg = render_diagram(_valid_config())
        assert "<svg" in svg
        assert "</svg>" in svg

    def test_raises_on_invalid(self):
        cfg = _valid_config()
        cfg.size = -1
        with pytest.raises(ValueError):
            render_diagram(cfg)

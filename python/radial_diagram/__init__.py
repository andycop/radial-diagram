"""
Radial Diagram Generator (Python port).

Public API mirrors the TypeScript package; see src/index.ts.
"""

from .geometry import (
    FacetAngle,
    LabelOrientation,
    Point,
    describe_arc,
    facet_angles,
    facet_score_path,
    label_orientation,
    polar_to_cartesian,
    ring_radii,
    score_to_radius,
    segment_angle,
    segment_path,
)
from .svg import SVGRenderer, render_diagram
from .types import (
    DEFAULT_SCALE,
    DEFAULT_STYLE,
    CenterConfig,
    DiagramConfig,
    Facet,
    ScaleConfig,
    Segment,
    StyleConfig,
    ValidationResult,
    create_config,
    diagram_from_dict,
    validate_config,
)

__version__ = "2.4.0"

__all__ = [
    "__version__",
    # types
    "CenterConfig",
    "DiagramConfig",
    "Facet",
    "ScaleConfig",
    "Segment",
    "StyleConfig",
    "ValidationResult",
    "DEFAULT_SCALE",
    "DEFAULT_STYLE",
    "create_config",
    "validate_config",
    "diagram_from_dict",
    # geometry
    "FacetAngle",
    "LabelOrientation",
    "Point",
    "describe_arc",
    "facet_angles",
    "facet_score_path",
    "label_orientation",
    "polar_to_cartesian",
    "ring_radii",
    "score_to_radius",
    "segment_angle",
    "segment_path",
    # renderer
    "SVGRenderer",
    "render_diagram",
]

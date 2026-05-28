"""
Configuration types for the Radial Diagram Generator.

Port of src/core/types.ts. Field names are kept in camelCase so the same
JSON configs used by the TypeScript renderer load directly into these
dataclasses with `from_dict`.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from typing import Any, ClassVar, Literal, get_type_hints


@dataclass
class Facet:
    name: str
    score: float | None = None
    description: str | None = None


@dataclass
class Segment:
    name: str
    color: str
    facets: list[Facet] = field(default_factory=list)
    labelColor: str | None = None


@dataclass
class CenterConfig:
    label: str
    radius: float
    color: str
    subtitle: str | None = None
    borderWidth: float | None = None
    borderColor: str | None = None
    visible: bool | None = None
    fontSize: float | None = None
    fontColor: str | None = None


@dataclass
class ScaleConfig:
    min: float = 1
    max: float = 5
    rings: int = 5
    ringLabels: list[str] | None = None


@dataclass
class StyleConfig:
    showRings: bool | None = None
    ringColor: str | None = None
    ringWidth: float | None = None
    ringStyle: Literal["solid", "dashed"] | None = None
    showScoreLabels: bool | None = None
    scoreLabelFontSize: float | None = None
    scoreLabelColor: str | None = None
    scoreLabelStrokeColor: str | None = None
    showFacetPoints: bool | None = None
    facetPointStyle: Literal["circle", "dot", "none"] | None = None
    facetOpacity: float | None = None
    segmentDividerWidth: float | None = None
    fontFamily: str | None = None
    backgroundColor: str | None = None
    segmentDividerColor: str | None = None
    showSegmentDividers: bool | None = None
    hubFontSize: float | None = None
    hubFontColor: str | None = None
    segmentFontSize: float | None = None
    facetFontSize: float | None = None
    facetFontColor: str | None = None
    segmentLabelPosition: Literal["outer", "inner"] | None = None
    flowDirection: Literal["clockwise", "counterclockwise"] | None = None
    flowCloseLoop: bool | None = None
    flowArrowColor: str | None = None
    flowArrowSize: float | None = None


@dataclass
class DiagramConfig:
    center: CenterConfig
    scale: ScaleConfig
    segments: list[Segment]
    style: StyleConfig
    size: float
    startAngle: float


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str]


DEFAULT_STYLE = StyleConfig(
    showRings=True,
    ringColor="#cccccc",
    ringWidth=1,
    ringStyle="dashed",
    showScoreLabels=False,
    scoreLabelFontSize=14,
    scoreLabelColor="#ffffff",
    scoreLabelStrokeColor="#333333",
    showFacetPoints=True,
    facetPointStyle="circle",
    facetOpacity=1,
    segmentDividerWidth=2,
    fontFamily="Arial, sans-serif",
    segmentDividerColor="#ffffff",
    showSegmentDividers=True,
    hubFontSize=14,
    hubFontColor="#ffffff",
    segmentFontSize=28,
    facetFontSize=11,
    segmentLabelPosition="outer",
    flowCloseLoop=False,
    flowArrowSize=14,
)

DEFAULT_SCALE = ScaleConfig(min=1, max=5, rings=5)


_DATACLASSES: dict[type, type] = {
    Facet: Facet,
    Segment: Segment,
    CenterConfig: CenterConfig,
    ScaleConfig: ScaleConfig,
    StyleConfig: StyleConfig,
}


def _coerce_field(field_type: Any, value: Any) -> Any:
    """Best-effort coercion of dict/list values into nested dataclass shapes."""
    if value is None:
        return None
    if is_dataclass(field_type) and isinstance(value, dict):
        return _from_dict(field_type, value)
    # Handle list[Facet], list[Segment], list[str] etc.
    origin = getattr(field_type, "__origin__", None)
    if origin is list and isinstance(value, list):
        (inner_type,) = field_type.__args__
        return [_coerce_field(inner_type, v) for v in value]
    return value


_HINT_CACHE: dict[type, dict[str, Any]] = {}


def _resolve_hints(cls: type) -> dict[str, Any]:
    if cls not in _HINT_CACHE:
        # localns lets get_type_hints find the dataclasses defined in this
        # module without a circular import.
        _HINT_CACHE[cls] = get_type_hints(cls, globalns=globals())
    return _HINT_CACHE[cls]


def _from_dict(cls: type, data: dict[str, Any]) -> Any:
    """Build a dataclass instance from a plain dict, coercing nested dataclasses."""
    hints = _resolve_hints(cls)
    kwargs: dict[str, Any] = {}
    for key, value in data.items():
        if key not in hints:
            continue  # tolerate stray fields
        kwargs[key] = _coerce_field(hints[key], value)
    return cls(**kwargs)


def diagram_from_dict(data: dict[str, Any]) -> DiagramConfig:
    """
    Parse a plain dict (e.g. from json.load) into a DiagramConfig.

    Used by callers loading configs from disk or HTTP requests.
    """
    return DiagramConfig(
        center=_from_dict(CenterConfig, data.get("center", {})),
        scale=_from_dict(ScaleConfig, data.get("scale", {})),
        segments=[_from_dict(Segment, s) for s in data.get("segments", [])],
        style=_from_dict(StyleConfig, data.get("style", {})),
        size=data.get("size", 0),
        startAngle=data.get("startAngle", 0),
    )


def validate_config(config: DiagramConfig) -> ValidationResult:
    """
    Validate a diagram configuration.

    Mirrors validateConfig() in src/core/types.ts. Error message strings are
    intentionally identical because they're user-facing.
    """
    errors: list[str] = []

    # Size validation
    if not config.size or config.size <= 0:
        errors.append("size must be greater than 0")

    # Center validation
    if not config.center:
        errors.append("center configuration is required")
    else:
        if not config.center.radius or config.center.radius <= 0:
            errors.append("center.radius must be greater than 0")

    # Scale validation
    if not config.scale:
        errors.append("scale configuration is required")
    else:
        if config.scale.min > config.scale.max:
            errors.append("scale.min must be less than or equal to scale.max")
        if not config.scale.rings or config.scale.rings <= 0:
            errors.append("scale.rings must be greater than 0")

    # Segments validation
    if not config.segments or len(config.segments) == 0:
        errors.append("segments array must contain at least one segment")
    else:
        for seg_index, segment in enumerate(config.segments):
            if not segment.facets or len(segment.facets) == 0:
                errors.append(f"segment[{seg_index}] must contain at least one facet")
            elif config.scale:
                for facet_index, facet in enumerate(segment.facets):
                    if facet.score is not None:
                        if facet.score < config.scale.min or facet.score > config.scale.max:
                            errors.append(
                                f"segment[{seg_index}].facet[{facet_index}].score "
                                f"({facet.score}) must be between {config.scale.min} "
                                f"and {config.scale.max}"
                            )

    # Center radius vs computed outer radius
    if config.size and config.center and config.center.radius:
        outer_radius = (config.size / 2) * 0.9
        if config.center.radius >= outer_radius:
            errors.append(
                f"center.radius ({config.center.radius}) must be less than "
                f"outer radius ({outer_radius:.1f})"
            )

    return ValidationResult(valid=len(errors) == 0, errors=errors)


def _merge_style(partial: StyleConfig | dict[str, Any] | None) -> StyleConfig:
    """Return a StyleConfig where unset fields fall back to DEFAULT_STYLE."""
    if partial is None:
        partial_dict: dict[str, Any] = {}
    elif isinstance(partial, dict):
        partial_dict = dict(partial)
    else:
        partial_dict = {
            f.name: getattr(partial, f.name)
            for f in fields(StyleConfig)
            if getattr(partial, f.name) is not None
        }
    merged = {f.name: getattr(DEFAULT_STYLE, f.name) for f in fields(StyleConfig)}
    merged.update({k: v for k, v in partial_dict.items() if v is not None})
    return StyleConfig(**merged)


def _merge_scale(partial: ScaleConfig | dict[str, Any] | None) -> ScaleConfig:
    if partial is None:
        partial_dict: dict[str, Any] = {}
    elif isinstance(partial, dict):
        partial_dict = dict(partial)
    else:
        partial_dict = {
            f.name: getattr(partial, f.name)
            for f in fields(ScaleConfig)
            if getattr(partial, f.name) is not None
        }
    merged = {
        "min": DEFAULT_SCALE.min,
        "max": DEFAULT_SCALE.max,
        "rings": DEFAULT_SCALE.rings,
        "ringLabels": DEFAULT_SCALE.ringLabels,
    }
    merged.update({k: v for k, v in partial_dict.items() if v is not None})
    return ScaleConfig(**merged)


def create_config(partial: dict[str, Any] | None = None) -> DiagramConfig:
    """
    Create a complete config with defaults filled in.

    Mirrors createConfig() in src/core/types.ts.
    """
    partial = partial or {}
    center_in = partial.get("center", {}) or {}
    return DiagramConfig(
        center=CenterConfig(
            label=center_in.get("label", "Core"),
            radius=center_in.get("radius", 60),
            color=center_in.get("color", "#8B3A62"),
            subtitle=center_in.get("subtitle"),
            borderWidth=center_in.get("borderWidth"),
            borderColor=center_in.get("borderColor"),
            visible=center_in.get("visible"),
            fontSize=center_in.get("fontSize"),
            fontColor=center_in.get("fontColor"),
        ),
        scale=_merge_scale(partial.get("scale")),
        segments=[
            _from_dict(Segment, s) if isinstance(s, dict) else s
            for s in (partial.get("segments") or [])
        ],
        style=_merge_style(partial.get("style")),
        size=partial.get("size", 800),
        startAngle=partial.get("startAngle", -90),
    )

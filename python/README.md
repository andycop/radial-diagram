# radial-diagram (Python)

Python port of the [radial-diagram](https://github.com/andycop/radial-diagram) TypeScript renderer. Generates the same circular/radial diagrams from the same JSON configs, intended for server-side use (PDF reports, batch image generation).

The TypeScript package is the canonical implementation. This port is held to byte-equivalent visual output via a shared cross-language test harness — see [`tests/shared/`](../tests/shared/) at the repo root.

## Install

For local development:

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
```

No runtime dependencies beyond the Python standard library.

## Usage

```python
import json
from radial_diagram import render_diagram

with open("config.json") as f:
    config = json.load(f)

svg = render_diagram(config)
with open("out.svg", "w") as f:
    f.write(svg)
```

The function accepts either a plain dict (loaded straight from JSON) or a `DiagramConfig` dataclass instance. See the [root README](../README.md) for the full config schema — field names are identical in both languages (camelCase, e.g. `startAngle`, `flowDirection`).

`render_diagram()` raises `ValueError` if the config is invalid, with the same human-readable error messages as the TypeScript renderer.

## Public API

Mirrors `src/index.ts`:

- **Types**: `DiagramConfig`, `Segment`, `Facet`, `CenterConfig`, `ScaleConfig`, `StyleConfig`, `ValidationResult`
- **Defaults**: `DEFAULT_STYLE`, `DEFAULT_SCALE`
- **Helpers**: `create_config()`, `validate_config()`, `diagram_from_dict()`
- **Geometry**: `polar_to_cartesian()`, `describe_arc()`, `segment_path()`, `facet_score_path()`, `segment_angle()`, `facet_angles()`, `score_to_radius()`, `ring_radii()`, `label_orientation()`
- **Renderer**: `SVGRenderer`, `render_diagram()`

## Testing

```bash
.venv/bin/python -m pytest tests/ -v
```

Includes:

- `tests/test_geometry.py` — unit tests for geometry helpers, mirrors `src/core/geometry.test.ts`.
- `tests/test_types.py` — config validation tests, mirrors `src/core/types.test.ts`.
- `tests/test_svg.py` — renderer smoke tests, mirrors `src/renderers/svg.test.ts`.
- `tests/test_equivalence.py` — cross-language test: for each tier config in `../tests/shared/configs/`, render with Python, rasterise via the shared Node helper, and pixel-diff against the TypeScript golden.

Before running `test_equivalence.py`, refresh the TypeScript goldens from the repo root:

```bash
npm run regenerate-goldens
```

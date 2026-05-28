"""
Cross-language equivalence: for each tier config in tests/shared/configs/,
render with the Python renderer, rasterise via the shared Node helper, and
pixel-diff against the TS-generated golden in tests/shared/goldens/ts/.

Run `npm run regenerate-goldens` first to refresh the TS goldens. The TS
renderer is the canonical "source of truth" — Python is expected to match.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SHARED_DIR = REPO_ROOT / "tests" / "shared"
CONFIGS_DIR = SHARED_DIR / "configs"
GOLDENS_DIR = SHARED_DIR / "goldens" / "ts"
DIFFS_DIR = SHARED_DIR / "goldens" / "diff"

sys.path.insert(0, str(SHARED_DIR))
from diff import diff_pngs, rasterise, write_side_by_side  # noqa: E402

from radial_diagram import render_diagram  # noqa: E402


# Threshold: at most 0.5% of pixels may differ by more than ~5/255 per channel.
# Set generously up-front; once we see the real noise floor we can tighten it.
FRAC_DIFFERING_LIMIT = 0.005
CHANNEL_THRESHOLD = 5


def _tier_configs() -> list[Path]:
    paths = sorted(CONFIGS_DIR.glob("tier-*.json"))
    if not paths:
        pytest.skip(f"no tier configs found under {CONFIGS_DIR}")
    return paths


def _require_golden(path: Path) -> bytes:
    if not path.exists():
        pytest.fail(
            f"missing golden {path.name} — run `npm run regenerate-goldens` first"
        )
    return path.read_bytes()


@pytest.mark.parametrize(
    "config_path",
    _tier_configs(),
    ids=lambda p: p.stem,
)
def test_python_matches_ts_golden(config_path: Path) -> None:
    raw = json.loads(config_path.read_text())
    raw.pop("_comment", None)

    py_svg = render_diagram(raw)
    py_png = rasterise(py_svg)

    golden_png = _require_golden(GOLDENS_DIR / f"{config_path.stem}.png")
    result = diff_pngs(py_png, golden_png, channel_threshold=CHANNEL_THRESHOLD)

    if result.fraction_differing > FRAC_DIFFERING_LIMIT:
        diff_out = DIFFS_DIR / f"{config_path.stem}.diff.png"
        write_side_by_side(py_png, golden_png, diff_out)
        pytest.fail(
            f"{config_path.stem}: {result}\n"
            f"  threshold: {FRAC_DIFFERING_LIMIT * 100:.3f}%\n"
            f"  side-by-side written to {diff_out}"
        )

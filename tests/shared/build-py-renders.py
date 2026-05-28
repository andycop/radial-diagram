"""
For each tier config:
  - render with the Python implementation
  - rasterise via the shared svg-to-png.mjs
  - write the PNG to tests/shared/goldens/py/<tier>.png
  - compute a heatmap diff against the TS golden and write to goldens/diff/<tier>.png

Invoked by `npm run regenerate-goldens` after the TS goldens are written.
Run directly with: python/.venv/bin/python tests/shared/build-py-renders.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REPO_ROOT / "python"))

from diff import diff_pngs, rasterise, write_diff_heatmap  # noqa: E402

from radial_diagram import render_diagram  # noqa: E402


CONFIGS_DIR = HERE / "configs"
TS_DIR = HERE / "goldens" / "ts"
PY_DIR = HERE / "goldens" / "py"
DIFF_DIR = HERE / "goldens" / "diff"

CHANNEL_THRESHOLD = 5


def main() -> int:
    PY_DIR.mkdir(parents=True, exist_ok=True)
    DIFF_DIR.mkdir(parents=True, exist_ok=True)

    tier_configs = sorted(CONFIGS_DIR.glob("tier-*.json"))
    if not tier_configs:
        print(f"no tier configs in {CONFIGS_DIR}", file=sys.stderr)
        return 1

    any_fail = False
    for config_path in tier_configs:
        tier = config_path.stem
        raw = json.loads(config_path.read_text())
        raw.pop("_comment", None)
        try:
            svg = render_diagram(raw)
            png = rasterise(svg)
        except Exception as exc:
            print(f"✗ {tier}: Python render/rasterise failed — {exc}")
            any_fail = True
            continue

        (PY_DIR / f"{tier}.svg").write_text(svg)
        (PY_DIR / f"{tier}.png").write_bytes(png)

        ts_png_path = TS_DIR / f"{tier}.png"
        if ts_png_path.exists():
            ts_png = ts_png_path.read_bytes()
            result = diff_pngs(png, ts_png, channel_threshold=CHANNEL_THRESHOLD)
            write_diff_heatmap(
                png, ts_png, DIFF_DIR / f"{tier}.png", channel_threshold=CHANNEL_THRESHOLD
            )
            marker = "✓" if result.fraction_differing < 0.005 else "⚠"
            print(f"{marker} {tier} — {result}")
        else:
            print(f"• {tier} — Python PNG written (no TS golden to diff against)")

    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main())

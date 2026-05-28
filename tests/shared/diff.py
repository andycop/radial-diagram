"""
Pixel-diff utility for cross-language renderer equivalence tests.

Used by python/tests/test_equivalence.py. Both sides rasterise via the same
Node helper (tests/shared/svg-to-png.mjs), so any pixel difference can only
come from the upstream renderer.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SHARED_DIR = REPO_ROOT / "tests" / "shared"
CONFIGS_DIR = SHARED_DIR / "configs"
GOLDENS_DIR = SHARED_DIR / "goldens" / "ts"
DIFFS_DIR = SHARED_DIR / "goldens" / "diff"
RASTERISER = SHARED_DIR / "svg-to-png.mjs"
TARGET_WIDTH = 1200


@dataclass
class DiffResult:
    width: int
    height: int
    max_channel_delta: int
    fraction_differing: float
    fraction_differing_threshold: float

    def __str__(self) -> str:
        return (
            f"{self.width}x{self.height} "
            f"max Δ={self.max_channel_delta} "
            f"fraction over {int(self.fraction_differing_threshold * 255)}/255 "
            f"= {self.fraction_differing * 100:.3f}%"
        )


def rasterise(svg: str, width: int = TARGET_WIDTH) -> bytes:
    """Rasterise an SVG string to PNG bytes via the shared Node helper."""
    result = subprocess.run(
        ["node", str(RASTERISER), "--width", str(width)],
        input=svg.encode("utf-8"),
        capture_output=True,
        check=True,
    )
    return result.stdout


def diff_pngs(
    a_bytes: bytes,
    b_bytes: bytes,
    channel_threshold: int = 5,
) -> DiffResult:
    """
    Compare two PNG byte buffers.

    Returns the fraction of pixels where any channel differs by more than
    `channel_threshold` (out of 255). Tolerates sub-pixel anti-aliasing
    nudges introduced by float-formatting differences between JS and Python,
    but catches any real visual divergence.
    """
    a = Image.open(_BytesIO(a_bytes)).convert("RGBA")
    b = Image.open(_BytesIO(b_bytes)).convert("RGBA")
    if a.size != b.size:
        raise AssertionError(
            f"PNG dimensions differ: {a.size} vs {b.size}"
        )

    diff = ImageChops.difference(a, b)
    max_delta = max(diff.getextrema(), key=lambda band: band[1])[1]

    # Per-pixel max-channel delta: collapse RGBA into a single-band image
    # of "did any channel differ by more than the threshold?".
    bands = diff.split()
    width, height = a.size
    over_threshold = 0
    total = width * height

    # Vectorise via Pillow point ops + image stats — cheap and avoids per-pixel Python loops.
    mask = None
    for band in bands:
        thresholded = band.point(lambda v, t=channel_threshold: 255 if v > t else 0)
        mask = thresholded if mask is None else ImageChops.lighter(mask, thresholded)
    if mask is not None:
        # mask is single-band with only 0 or 255 values; histogram[255] = count differing
        over_threshold = mask.histogram()[255]

    return DiffResult(
        width=width,
        height=height,
        max_channel_delta=max_delta,
        fraction_differing=over_threshold / total,
        fraction_differing_threshold=channel_threshold / 255,
    )


def write_side_by_side(a_bytes: bytes, b_bytes: bytes, out_path: Path) -> None:
    """Write a side-by-side PNG (a | diff | b) for human eyeballing on failure."""
    a = Image.open(_BytesIO(a_bytes)).convert("RGBA")
    b = Image.open(_BytesIO(b_bytes)).convert("RGBA")
    diff = ImageChops.difference(a, b)

    w, h = a.size
    sheet = Image.new("RGBA", (w * 3, h), (255, 255, 255, 255))
    sheet.paste(a, (0, 0))
    sheet.paste(diff, (w, 0))
    sheet.paste(b, (2 * w, 0))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, format="PNG")


def write_diff_heatmap(
    a_bytes: bytes,
    b_bytes: bytes,
    out_path: Path,
    *,
    channel_threshold: int = 5,
) -> None:
    """
    Write a standalone heatmap PNG highlighting where two renders differ.

    Identical pixels become transparent; differing pixels become solid red,
    intensity scaled by the worst per-channel delta. Used by the contact-sheet
    builder so the middle column visually screams when something diverges.
    """
    a = Image.open(_BytesIO(a_bytes)).convert("RGBA")
    b = Image.open(_BytesIO(b_bytes)).convert("RGBA")
    diff = ImageChops.difference(a, b)

    # Collapse 4 channels into one "max channel delta" band.
    bands = diff.split()
    worst = bands[0]
    for band in bands[1:]:
        worst = ImageChops.lighter(worst, band)

    # Threshold: anything below threshold is fully transparent, above the
    # threshold becomes red with alpha proportional to the worst channel delta.
    mask = worst.point(lambda v, t=channel_threshold: 0 if v <= t else min(255, v * 4))

    heatmap = Image.new("RGBA", a.size, (255, 0, 0, 0))
    # Build the alpha channel from the mask
    r, g, b_band, _ = heatmap.split()
    heatmap = Image.merge("RGBA", (r, g, b_band, mask))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    heatmap.save(out_path, format="PNG")


def _BytesIO(data: bytes):
    from io import BytesIO

    return BytesIO(data)

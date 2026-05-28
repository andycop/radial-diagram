/**
 * Shared rasterisation function. Single source of truth so the regen script
 * and the stdin CLI produce identical PNG output for identical SVG input.
 */

import { Resvg } from "@resvg/resvg-js";

export function svgToPng(svg, { width = 1200 } = {}) {
  // No `background` option = fully transparent canvas, alpha preserved end
  // to end. The cross-language diff is RGBA so any unintended opaque fill or
  // dropped alpha will show up. If a config sets style.backgroundColor, that
  // rect is part of the SVG itself.
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  });
  return resvg.render().asPng();
}

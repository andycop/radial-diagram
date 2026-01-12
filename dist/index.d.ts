/**
 * Radial Diagram Generator
 * A configurable circular/radial diagram generator
 *
 * @license MIT
 * @copyright 2026 CGA Management Ltd
 * @see https://www.cgamanagement.co.uk/category/tools
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export type { DiagramConfig, Segment, Facet, CenterConfig, ScaleConfig, StyleConfig, ValidationResult, } from './core/types.js';
export { DEFAULT_STYLE, DEFAULT_SCALE, createConfig, validateConfig, } from './core/types.js';
export { polarToCartesian, describeArc, segmentPath, facetScorePath, segmentAngle, facetAngles, scoreToRadius, ringRadii, labelOrientation, } from './core/geometry.js';
export { SVGRenderer, renderDiagram } from './renderers/svg.js';
//# sourceMappingURL=index.d.ts.map
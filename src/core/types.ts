/**
 * Configuration types for the Radial Diagram Generator
 *
 * @license MIT
 * @copyright 2026 CGA Management Ltd
 * @see https://www.cgamanagement.co.uk/category/tools
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface Facet {
  /** Display name for this facet */
  name: string;
  /** Score value (within scale min-max range) */
  score?: number;
  /** Optional description for tooltips */
  description?: string;
}

export interface Segment {
  /** Display name for the segment */
  name: string;
  /** Segment fill color (hex or CSS color) */
  color: string;
  /** Facets within this segment */
  facets: Facet[];
}

export interface CenterConfig {
  /** Label text for center hub */
  label: string;
  /** Radius of center hub in pixels */
  radius: number;
  /** Fill color for center hub */
  color: string;
  /** Optional secondary line of text */
  subtitle?: string;
  /** Border/stroke width (0 for no border) */
  borderWidth?: number;
  /** Border/stroke color */
  borderColor?: string;
  /** Set to false to hide the center hub entirely */
  visible?: boolean;
  /** Font size for center hub label (overrides style.hubFontSize) */
  fontSize?: number;
  /** Font color for center hub label (overrides style.hubFontColor) */
  fontColor?: string;
}

export interface ScaleConfig {
  /** Minimum score value */
  min: number;
  /** Maximum score value */
  max: number;
  /** Number of concentric rings to display */
  rings: number;
  /** Optional labels for each ring level */
  ringLabels?: string[];
}

export interface StyleConfig {
  /** Show concentric ring circles */
  showRings?: boolean;
  /** Color for ring circles */
  ringColor?: string;
  /** Width of ring circle strokes */
  ringWidth?: number;
  /** Style of ring circles: 'solid' or 'dashed' */
  ringStyle?: 'solid' | 'dashed';
  /** Show score level labels */
  showScoreLabels?: boolean;
  /** Font size for score labels */
  scoreLabelFontSize?: number;
  /** Fill color for score labels */
  scoreLabelColor?: string;
  /** Stroke/outline color for score labels */
  scoreLabelStrokeColor?: string;
  /** Show facet points on arcs */
  showFacetPoints?: boolean;
  /** Style of facet points: 'circle', 'dot', 'none' */
  facetPointStyle?: 'circle' | 'dot' | 'none';
  /** Opacity of facet score fill areas (0-1) */
  facetOpacity?: number;
  /** Width of segment divider lines */
  segmentDividerWidth?: number;
  /** Font family for labels */
  fontFamily?: string;
  /** Background color (default transparent) */
  backgroundColor?: string;
  /** Color for segment divider lines */
  segmentDividerColor?: string;
  /** Show segment divider lines */
  showSegmentDividers?: boolean;
  /** Font size for center hub label */
  hubFontSize?: number;
  /** Font color for center hub label */
  hubFontColor?: string;
  /** Font size for segment labels */
  segmentFontSize?: number;
  /** Font size for facet labels */
  facetFontSize?: number;
  /** Font color for facet labels */
  facetFontColor?: string;
}

export interface DiagramConfig {
  /** Center hub configuration */
  center: CenterConfig;
  /** Score scale configuration */
  scale: ScaleConfig;
  /** Outer segments */
  segments: Segment[];
  /** Visual style options */
  style: StyleConfig;
  /** Total diagram size in pixels (width = height) */
  size: number;
  /** Starting angle offset in degrees (-90 = top, 0 = right) */
  startAngle: number;
}

/** Default style configuration */
export const DEFAULT_STYLE: StyleConfig = {
  showRings: true,
  ringColor: '#cccccc',
  ringWidth: 1,
  ringStyle: 'dashed',
  showScoreLabels: false,
  scoreLabelFontSize: 14,
  scoreLabelColor: '#ffffff',
  scoreLabelStrokeColor: '#333333',
  showFacetPoints: true,
  facetPointStyle: 'circle',
  facetOpacity: 1,
  segmentDividerWidth: 2,
  fontFamily: 'Arial, sans-serif',
  segmentDividerColor: '#ffffff',
  showSegmentDividers: true,
  hubFontSize: 14,
  hubFontColor: '#ffffff',
  segmentFontSize: 28,
  facetFontSize: 11,
};

/** Default scale configuration */
export const DEFAULT_SCALE: ScaleConfig = {
  min: 1,
  max: 5,
  rings: 5,
};

/** Result of config validation */
export interface ValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
}

/**
 * Validate a diagram configuration
 * @param config The config to validate
 * @returns ValidationResult with valid flag and any error messages
 */
export function validateConfig(config: DiagramConfig): ValidationResult {
  const errors: string[] = [];

  // Size validation
  if (!config.size || config.size <= 0) {
    errors.push('size must be greater than 0');
  }

  // Center validation
  if (!config.center) {
    errors.push('center configuration is required');
  } else {
    if (!config.center.radius || config.center.radius <= 0) {
      errors.push('center.radius must be greater than 0');
    }
  }

  // Scale validation
  if (!config.scale) {
    errors.push('scale configuration is required');
  } else {
    if (config.scale.min > config.scale.max) {
      errors.push('scale.min must be less than or equal to scale.max');
    }
    if (!config.scale.rings || config.scale.rings <= 0) {
      errors.push('scale.rings must be greater than 0');
    }
  }

  // Segments validation
  if (!config.segments || config.segments.length === 0) {
    errors.push('segments array must contain at least one segment');
  } else {
    config.segments.forEach((segment, segIndex) => {
      if (!segment.facets || segment.facets.length === 0) {
        errors.push(`segment[${segIndex}] must contain at least one facet`);
      } else if (config.scale) {
        // Only validate scores if scale is defined
        segment.facets.forEach((facet, facetIndex) => {
          if (facet.score !== undefined && facet.score !== null) {
            if (facet.score < config.scale.min || facet.score > config.scale.max) {
              errors.push(
                `segment[${segIndex}].facet[${facetIndex}].score (${facet.score}) must be between ${config.scale.min} and ${config.scale.max}`
              );
            }
          }
        });
      }
    });
  }

  // Check that center radius is less than computed outer radius
  if (config.size && config.center?.radius) {
    const outerRadius = (config.size / 2) * 0.9;
    if (config.center.radius >= outerRadius) {
      errors.push(
        `center.radius (${config.center.radius}) must be less than outer radius (${outerRadius.toFixed(1)})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Create a complete config with defaults filled in */
export function createConfig(partial: Partial<DiagramConfig>): DiagramConfig {
  return {
    center: {
      label: partial.center?.label ?? 'Core',
      radius: partial.center?.radius ?? 60,
      color: partial.center?.color ?? '#8B3A62',
      subtitle: partial.center?.subtitle,
      borderWidth: partial.center?.borderWidth,
      borderColor: partial.center?.borderColor,
      visible: partial.center?.visible,
      fontSize: partial.center?.fontSize,
      fontColor: partial.center?.fontColor,
    },
    scale: { ...DEFAULT_SCALE, ...partial.scale },
    segments: partial.segments || [],
    style: { ...DEFAULT_STYLE, ...partial.style },
    size: partial.size || 800,
    startAngle: partial.startAngle ?? -90, // Default to top
  };
}

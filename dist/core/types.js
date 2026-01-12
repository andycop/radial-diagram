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
/** Default style configuration */
export const DEFAULT_STYLE = {
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
export const DEFAULT_SCALE = {
    min: 1,
    max: 5,
    rings: 5,
};
/**
 * Validate a diagram configuration
 * @param config The config to validate
 * @returns ValidationResult with valid flag and any error messages
 */
export function validateConfig(config) {
    const errors = [];
    // Size validation
    if (!config.size || config.size <= 0) {
        errors.push('size must be greater than 0');
    }
    // Center validation
    if (!config.center) {
        errors.push('center configuration is required');
    }
    else {
        if (!config.center.radius || config.center.radius <= 0) {
            errors.push('center.radius must be greater than 0');
        }
    }
    // Scale validation
    if (!config.scale) {
        errors.push('scale configuration is required');
    }
    else {
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
    }
    else {
        config.segments.forEach((segment, segIndex) => {
            if (!segment.facets || segment.facets.length === 0) {
                errors.push(`segment[${segIndex}] must contain at least one facet`);
            }
            else if (config.scale) {
                // Only validate scores if scale is defined
                segment.facets.forEach((facet, facetIndex) => {
                    if (facet.score !== undefined && facet.score !== null) {
                        if (facet.score < config.scale.min || facet.score > config.scale.max) {
                            errors.push(`segment[${segIndex}].facet[${facetIndex}].score (${facet.score}) must be between ${config.scale.min} and ${config.scale.max}`);
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
            errors.push(`center.radius (${config.center.radius}) must be less than outer radius (${outerRadius.toFixed(1)})`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/** Create a complete config with defaults filled in */
export function createConfig(partial) {
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
//# sourceMappingURL=types.js.map
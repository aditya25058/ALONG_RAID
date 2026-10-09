
import { Rider, Driver, Vehicle, PricingContext } from '../types';

/**
 * Transforms efficiency_score into a pricing multiplier and calculates the Detour Tax.
 * Formula: Tax = (BaseFare * (1 - EfficiencyScore) * DetourDistanceMultiplier)
 */
export function calculateDetourTax(
    baseFare: number,
    efficiencyScore: number,
    detourDistanceKm: number
): number {
    if (efficiencyScore >= 0.9) return 0; // High efficiency = No Tax

    const detourMultiplier = 0.5; // Fixed multiplier for detour impact
    const tax = baseFare * (1 - efficiencyScore) * detourDistanceKm * detourMultiplier;

    return Math.max(0, tax);
}

/**
 * Dynamically reduces the "Pooling Discount" for existing riders if the new rider's entry
 * significantly reduces efficiency. This compensates the driver for extra time/fuel.
 */
export function throttlePoolingRebate(
    originalRebate: number,
    efficiencyImpact: number // 0.0 to 1.0 (drop in efficiency)
): number {
    const throttleFactor = 1.5; // Aggressiveness of rebate reduction
    const reduction = originalRebate * efficiencyImpact * throttleFactor;

    return Math.max(0, originalRebate - reduction);
}

/**
 * Calculates a composite efficiency score (0.0 - 1.0) for a match.
 */
export function calculateEfficiencyScore(
    detourTimeSeconds: number,
    maxDetourSeconds: number,
    soloDistanceKm: number,
    actualDistanceKm: number
): number {
    const timeEfficiency = 1 - (detourTimeSeconds / maxDetourSeconds);
    const distanceEfficiency = soloDistanceKm / actualDistanceKm;

    // Weighted average: Distance efficiency is usually more critical for fuel/wear
    const weightedScore = (timeEfficiency * 0.4) + (distanceEfficiency * 0.6);

    return Math.min(1, Math.max(0, weightedScore));
}

/**
 * Calculates System Integrity Score (SIS).
 * Detects Cluster Deceleration (e.g., Driver Cartels).
 */
export function calculateSIS(
    driverSpeedsKmH: number[],
    expectedSpeedKmH: number
): number {
    if (driverSpeedsKmH.length < 3) return 100; // Not enough data to claim coordination

    const avgSpeed = driverSpeedsKmH.reduce((a, b) => a + b, 0) / driverSpeedsKmH.length;
    const speedRatio = avgSpeed / expectedSpeedKmH;

    if (speedRatio < 0.2) return 30; // Highly suspicious
    if (speedRatio < 0.5) return 60; // Moderate concern
    return 100; // Normal
}

/**
 * Prevents vertical price spikes during mocked "Rain Events" via a smoothing filter.
 */
export function applySurgeSmoothing(
    burstCount: number,
    timeWindowSeconds: number,
    rawMultiplier: number
): number {
    const density = burstCount / timeWindowSeconds;
    if (density > 0.3) { // High burst intensity (e.g., 50 requests in 120s = 0.41)
        const smoothingAlpha = 0.5;
        return 1 + ((rawMultiplier - 1) * smoothingAlpha);
    }
    return rawMultiplier;
}

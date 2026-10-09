import { LatLng } from '../types';
import { snapCoord, calculateTimeFixed } from './PermutationOptimizer';

/**
 * DIRECTIONAL AFFINITY ENGINE
 * Checks if two trips are moving in the same general corridor.
 */
export function getDirectionalAffinity(start1: LatLng, end1: LatLng, start2: LatLng, end2: LatLng): number {
    const v1 = { x: end1.lng - start1.lng, y: end1.lat - start1.lat };
    const v2 = { x: end2.lng - start2.lng, y: end2.lat - start2.lat };

    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
    return dot; // Cosine similarity: 1.0 = same direction, 0 = perpendicular, -1 = opposite
}

/**
 * CORRIDOR PRUNING
 * Checks if a point lies within a 'Spine' defined by a route.
 */
export function isPointInCorridor(point: LatLng, spine: LatLng[], radiusDegrees: number = 0.005): boolean {
    // Check Manhattan distance for fast pruning
    for (const stop of spine) {
        const dist = Math.abs(point.lat - stop.lat) + Math.abs(point.lng - stop.lng);
        if (dist <= radiusDegrees) return true;
    }
    return false;
}

/**
 * DIVIDER PARADOX DETECTION (The Bangalore Standard)
 * Detects if a candidate is on the 'wrong side' of a divided road spine.
 */
export function getConnectivityPenalty(driverPos: LatLng, spineEnd: LatLng, candidatePos: LatLng, profile: any): number {
    const dV = { x: spineEnd.lng - driverPos.lng, y: spineEnd.lat - driverPos.lat };
    const cV = { x: candidatePos.lng - driverPos.lng, y: candidatePos.lat - driverPos.lat };

    // Cross product (2D) to find lateral side
    const cross = dV.x * cV.y - dV.y * cV.x;

    // If candidate is > 50m away laterally (approx 0.0005 deg) on opposite side
    if (Math.abs(cross) > 0.00005) {
        return profile.id === 'BANGALORE_PEAK' ? profile.connectivityPenaltyBaseSec : 60;
    }

    return 0;
}

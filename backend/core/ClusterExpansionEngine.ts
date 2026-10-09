import { LatLng, Rider, Stop } from '../types';
import { snapCoord, calculateTimeFixed } from './PermutationOptimizer';
import { getDirectionalAffinity, isPointInCorridor } from './AffinityEngine';

export interface ClusterResult {
    bestSequence: Stop[];
    minTotalTime: number;
    detourSeconds: number;
}

/**
 * CLUSTER EXPANSION ENGINE
 * Deterministically Grows a ride cluster by evaluating O(m^2) insertion points.
 */
export function expandCluster(
    driverLoc: LatLng,
    existingStops: Stop[],
    candidate: Rider,
    speedKmH: number
): ClusterResult | null {

    // 1. Semantic Pruning
    const p1 = snapCoord(driverLoc);
    const cPick = snapCoord(candidate.pickup);
    const cDest = snapCoord(candidate.destination);

    // If existingStops is empty, this is a solo ride. 
    if (existingStops.length === 0) {
        const stops: Stop[] = [
            { id: `${candidate.id}-P`, riderId: candidate.id, type: 'PICKUP', location: cPick },
            { id: `${candidate.id}-D`, riderId: candidate.id, type: 'DROPOFF', location: cDest }
        ];
        const time = calculateTimeFixed(p1, cPick, speedKmH) + calculateTimeFixed(cPick, cDest, speedKmH);
        return { bestSequence: stops, minTotalTime: time, detourSeconds: 0 };
    }

    // Corridor & Affinity Filters
    const affinity = getDirectionalAffinity(
        existingStops[0].location,
        existingStops[existingStops.length - 1].location,
        cPick,
        cDest
    );
    if (affinity < 0.5) return null; // Directional mismatch

    if (!isPointInCorridor(cPick, existingStops.map(s => s.location))) {
        // Optional: Fast fail if pickup is too far from current spine
        // return null; 
    }

    // 2. Incremental Insertion (O(m^2))
    let minTime = Infinity;
    let bestSeq: Stop[] = [];

    const m = existingStops.length;
    for (let i = 0; i <= m; i++) {
        // Insert Pickup at index i
        const withPickup = [...existingStops];
        const pickStop: Stop = { id: `${candidate.id}-P`, riderId: candidate.id, type: 'PICKUP', location: cPick };
        withPickup.splice(i, 0, pickStop);

        for (let j = i + 1; j <= m + 1; j++) {
            // Insert Dropoff at index j
            const finalSeq = [...withPickup];
            const dropStop: Stop = { id: `${candidate.id}-D`, riderId: candidate.id, type: 'DROPOFF', location: cDest };
            finalSeq.splice(j, 0, dropStop);

            // Calculate Time
            let currentTime = 0;
            let prevLoc = p1;
            for (const s of finalSeq) {
                currentTime += calculateTimeFixed(prevLoc, s.location, speedKmH);
                prevLoc = s.location;
            }

            if (currentTime < minTime) {
                minTime = currentTime;
                bestSeq = finalSeq;
            }
        }
    }

    // 3. Baseline for Detour Calculation
    // Solo baseline = sum of existing riders' solo times? 
    // No, detour is usually (Actual - Solo_of_Primary). 
    // For clusters, we check detour per rider.

    return {
        bestSequence: bestSeq,
        minTotalTime: minTime,
        detourSeconds: 0 // Will be calculated per rider in simulation
    };
}

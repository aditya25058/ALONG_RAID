import { LatLng } from '../types';

/**
 * FIXED-GRID SPATIAL SNAPPING
 * Snaps coordinates to a 100m grid to increase shared path affinity.
 * 1 degree is roughly 111,000 meters. 0.001 deg is ~111m.
 */
export function snapCoord(coord: LatLng): LatLng {
    const GRID_SIZE = 0.001; // ~111 meters
    return {
        lat: Math.round(coord.lat / GRID_SIZE) * GRID_SIZE,
        lng: Math.round(coord.lng / GRID_SIZE) * GRID_SIZE
    };
}

/**
 * DETERMINISTIC TRAVEL TIME (Fixed-Point)
 */
export function calculateTimeFixed(a: LatLng, b: LatLng, speedKmH: number = 40): number {
    const latDiff = Math.abs(Math.round(a.lat * 1000000) - Math.round(b.lat * 1000000));
    const lngDiff = Math.abs(Math.round(a.lng * 1000000) - Math.round(b.lng * 1000000));
    const distUnits = latDiff + lngDiff; // 1M units per degree

    // speed is basically dist/time. 40km/h = 40,000m / 3600s = 11.1 m/s.
    // 1 deg ~ 111,000m. 
    // time = dist(deg) * 111000 / (speedKmH * 1000 / 3600)
    // time = dist(deg) * 399600 / speedKmH
    const timeSec = Math.round((distUnits / 1000000) * (399600 / speedKmH));
    return timeSec;
}

export interface Stop {
    id: string;
    location: LatLng;
    type: 'PICKUP' | 'DROPOFF';
    riderId: string;
}

/**
 * ROUTE PERMUTATION OPTIMIZER (O(1) Bounded)
 * Evaluates sequences to find the absolute minimum detour.
 */
export function findOptimalSequence(
    driverLoc: LatLng,
    primaryRider: { pickup: LatLng, dest: LatLng, id: string },
    candidateRider: { pickup: LatLng, dest: LatLng, id: string },
    speedKmH: number
): { sequence: Stop[], totalTime: number } {

    // Snapping
    const pPick = snapCoord(primaryRider.pickup);
    const pDest = snapCoord(primaryRider.dest);
    const cPick = snapCoord(candidateRider.pickup);
    const cDest = snapCoord(candidateRider.dest);
    const dLoc = snapCoord(driverLoc);

    // For 2 riders, we have 4 points to visit (after starting from driverLoc).
    // Primary is already in ride? No, in SIMULATE_POOL_JOIN, Primary is already in. 
    // So the driver is at SOME location, Primary Pickup is done (usually).
    // Let's assume the Driver is at dLoc, and needs to drop Primary + Pick/Drop Candidate.

    // Possible Stops:
    const stops: Stop[] = [
        { id: 'PD', riderId: primaryRider.id, type: 'DROPOFF', location: pDest },
        { id: 'CP', riderId: candidateRider.id, type: 'PICKUP', location: cPick },
        { id: 'CD', riderId: candidateRider.id, type: 'DROPOFF', location: cDest }
    ];

    // Factorial complexity guard:
    // With 3 stops, there are 3! = 6 permutations.
    // Constraint: CD must come after CP.

    const permutations: Stop[][] = [
        [stops[1], stops[2], stops[0]], // CP -> CD -> PD
        [stops[1], stops[0], stops[2]], // CP -> PD -> CD
        [stops[0], stops[1], stops[2]]  // PD -> CP -> CD (Primary Drop first, then Candidate)
    ];

    let bestSeq: Stop[] = [];
    let minTime = Infinity;

    for (const seq of permutations) {
        let currentTime = 0;
        let prevLoc = dLoc;
        for (const stop of seq) {
            currentTime += calculateTimeFixed(prevLoc, stop.location, speedKmH);
            prevLoc = stop.location;
        }

        if (currentTime < minTime) {
            minTime = currentTime;
            bestSeq = seq;
        }
    }

    return { sequence: bestSeq, totalTime: minTime };
}

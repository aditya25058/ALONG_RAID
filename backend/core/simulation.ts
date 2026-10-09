import { RideState } from './stateMachine';
import { Rider, PricingContext, Driver, Vehicle, VehicleType, Stop } from '../types';
import { InvariantResult, InvariantSnapshot, assertInvariants } from './invariants';
import { PricingResult, getVehicleSpecs } from '../services/rideMatchingService';
import { calculateDistanceKm } from '../services/routingService';
import { getEffectiveCityConfig } from './cityConfig';
import { Clock } from './time';
import { CONFIG } from './config';
import { snapCoord, calculateTimeFixed } from './PermutationOptimizer';
import { expandCluster } from './ClusterExpansionEngine';
import { getConnectivityPenalty } from './AffinityEngine';
import { ChaosProfiles, TimeBucket, ZoneType } from '../types';

export interface SimulationResult {
    proposedRoute: any[]; // LatLng[]
    proposedStops: Stop[];
    pricing: PricingResult | null;
    riderMetrics: {
        id: string;
        detourSec: number;
        marginalHarmSec: number;
        fare: number;
        soloFare: number;
    }[];
    invariantResult: InvariantResult;
    capacity: {
        seatsRequired: number;
        seatsAvailable: number;
        bagsRequired: number;
        bagsAvailable: number;
    };
}

function paise(rupees: number): number {
    return Math.round(rupees * 100);
}

function rupeesFromPaise(paiseValue: number): number {
    return paiseValue / 100;
}

function createRng(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export async function simulateInsertC(
    ride: RideState,
    candidate: Rider,
    vehicle: Vehicle,
    context: PricingContext,
    seed: number = 12345
): Promise<SimulationResult> {
    const rng = createRng(seed);

    if (!CONFIG.POOLING_ENABLED) {
        return {
            proposedRoute: [], proposedStops: [], pricing: null, riderMetrics: [],
            capacity: { seatsRequired: 0, seatsAvailable: 0, bagsRequired: 0, bagsAvailable: 0 },
            invariantResult: { success: false, code: "POOLING_DISABLED", reason: "Disabled in CONFIG" }
        };
    }

    const cluster = expandCluster(ride.driver.currentLocation, ride.stops, candidate, ride.driver.vehicleSpeedKmH);

    if (!cluster) {
        return {
            proposedRoute: [], proposedStops: [], pricing: null, riderMetrics: [],
            capacity: { seatsRequired: 0, seatsAvailable: 0, bagsRequired: 0, bagsAvailable: 0 },
            invariantResult: { success: false, code: "GEO_MISMATCH", reason: "Directional or Corridor mismatch" }
        };
    }

    const riderMetrics: SimulationResult['riderMetrics'] = [];

    // 2. Resolve Chaos Profile & Velocity (The Bangalore Standard)
    const profile = context.chaosProfile || ChaosProfiles['NORMAL'];
    const now = Clock.now();
    const hour = new Date(now).getHours();
    const timeBucket = (hour >= 8 && hour <= 11) ? TimeBucket.MORNING_PEAK : (hour >= 17 && hour <= 21) ? TimeBucket.EVENING_PEAK : TimeBucket.NORMAL;
    const speed = profile.velocityProfile[timeBucket];

    const getArrivalTime = (sequence: Stop[], riderId: string, type: 'PICKUP' | 'DROPOFF'): number => {
        let time = 0;
        let prev = snapCoord(ride.driver.currentLocation);
        for (const s of sequence) {
            // A. Drive Time
            time += calculateTimeFixed(prev, s.location, speed);

            // B. Boarding Buffer (The Friction Factor)
            const zoneBuffer = profile.defaultBoardingBufferSec; // Simplified; Tech Park logic would look up location
            time += zoneBuffer;

            // C. Divider Penalty (The Bangalore Standard)
            if (s.riderId === candidate.id && s.type === 'PICKUP') {
                time += getConnectivityPenalty(ride.driver.currentLocation, sequence[sequence.length - 1].location, candidate.pickup, profile);
            }

            if (s.riderId === riderId && s.type === type) return time;
            prev = s.location;
        }
        return time;
    };

    // Deterministic Pricing logic
    const calcSoloFare = (distKm: number) => {
        const base = 80;
        const perKm = 60;
        return (base + distKm * perKm) * 1.2; // 20% service fee
    };

    // Existing Riders
    for (const r of ride.riders) {
        const arrivalPickup = getArrivalTime(cluster.bestSequence, r.id, 'PICKUP');
        const arrivalDrop = getArrivalTime(cluster.bestSequence, r.id, 'DROPOFF');
        const actualTripTime = arrivalDrop - arrivalPickup;
        const soloTime = calculateTimeFixed(snapCoord(r.pickup), snapCoord(r.destination), speed);
        const detour = Math.max(0, actualTripTime - soloTime);

        riderMetrics.push({
            id: r.id,
            detourSec: detour,
            marginalHarmSec: Math.max(0, detour - (r.currentDetourSec || 180)),
            fare: r.currentFare || 100,
            soloFare: r.soloFare || 120
        });
    }

    // Candidate
    const cSoloDist = calculateDistanceKm(candidate.pickup, candidate.destination);
    const cSoloFare = calcSoloFare(cSoloDist);
    const cSoloTime = calculateTimeFixed(snapCoord(candidate.pickup), snapCoord(candidate.destination), speed);
    const cArrivalPickup = getArrivalTime(cluster.bestSequence, candidate.id, 'PICKUP');
    const cArrivalDrop = getArrivalTime(cluster.bestSequence, candidate.id, 'DROPOFF');
    const cActualTime = cArrivalDrop - cArrivalPickup;
    const cDetour = Math.max(0, cActualTime - cSoloTime);

    riderMetrics.push({
        id: candidate.id,
        detourSec: cDetour,
        marginalHarmSec: 0,
        fare: cSoloFare * 0.75, // 25% pooling discount
        soloFare: cSoloFare
    });

    const capacity = {
        seatsRequired: ride.riders.reduce((s, r) => s + (r.requestedSeats || 1), 0) + (candidate.requestedSeats || 1),
        seatsAvailable: vehicle.totalSeats,
        bagsRequired: ride.riders.reduce((s, r) => s + (r.requestedBagUnits || 0), 0) + (candidate.requestedBagUnits || 0),
        bagsAvailable: vehicle.totalBootUnits
    };

    const snapshot: InvariantSnapshot = {
        riders: riderMetrics.map(rm => ({ ...rm, isConsentValid: true, isSafePickup: true })),
        driver: { earning: 200, baseEarning: 100 },
        platform: { margin: 50 },
        capacity,
        cityConfig: getEffectiveCityConfig(ride.cityCode, Clock.now())
    };

    const invRes = assertInvariants(snapshot);

    return {
        proposedRoute: cluster.bestSequence.map(s => s.location),
        proposedStops: cluster.bestSequence,
        pricing: {
            riderAFare: riderMetrics[0].fare,
            riderASoloFare: riderMetrics[0].soloFare,
            riderCFare: riderMetrics[riderMetrics.length - 1].fare,
            riderCSoloFare: riderMetrics[riderMetrics.length - 1].soloFare,
            driverEarning: 200,
            driverBaseEarning: 100,
            platformMargin: 50,
            profitabilityScore: 1,
            detourTax: 0
        },
        riderMetrics,
        invariantResult: invRes,
        capacity
    };
}

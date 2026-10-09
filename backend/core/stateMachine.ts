import { Driver, Rider, LatLng, Stop } from '../types';
import { PricingResult } from '../services/rideMatchingService';
import { hashRoute, createConsentToken, validateConsentToken, ConsentToken } from './consent';
import { getEffectiveCityConfig } from './cityConfig';
import { assertInvariants, InvariantSnapshot } from './invariants';
import { SimulationResult } from './simulation';
import { CONFIG } from './config';
import { Clock } from './time';
import { count } from './metrics';
import * as crypto from 'crypto';

// --- Ride Status Enum ---
export type RideStatus =
    | "IDLE"
    | "SOLO_ACTIVE"
    | "POOL_CANDIDATE"
    | "CONSENT_PENDING"
    | "PRICE_LOCKED"
    | "POOLED_ACTIVE"
    | "COMPLETED"
    | "ABORTED";

// --- Ride State Interface ---
export interface RideState {
    rideId: string;
    cityCode: string;
    status: RideStatus;
    route: LatLng[];
    pricing?: PricingResult;
    riders: Rider[];
    stops: Stop[];
    driver: Driver;
    timestamps: {
        createdAt: number;
        consentStartedAt?: number;
        priceLockedAt?: number;
        pooledStartedAt?: number;
        completedAt?: number;
        abortedAt?: number;
    };
    simulationSeed: number;
    pendingConsents?: Record<string, ConsentToken>;
    lastSimulationResult?: SimulationResult;
    pendingCandidate?: Rider;
}

// --- Legal Transition Map ---
const LEGAL_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
    "IDLE": ["SOLO_ACTIVE"],
    "SOLO_ACTIVE": ["POOL_CANDIDATE", "CONSENT_PENDING", "COMPLETED", "ABORTED"],
    "POOL_CANDIDATE": ["CONSENT_PENDING", "SOLO_ACTIVE", "ABORTED"],
    "CONSENT_PENDING": ["PRICE_LOCKED", "SOLO_ACTIVE", "ABORTED"],
    "PRICE_LOCKED": ["POOLED_ACTIVE", "ABORTED"],
    "POOLED_ACTIVE": ["POOL_CANDIDATE", "CONSENT_PENDING", "COMPLETED", "ABORTED"],
    "COMPLETED": [],
    "ABORTED": ["SOLO_ACTIVE"]
};

function logTransition(rideId: string, from: RideStatus, to: RideStatus, reason?: string) {
    console.log(`[RSM] Ride ${rideId} transition: ${from} -> ${to} ${reason ? `[Reason: ${reason}]` : ''}`);
    count('ride_transition', { from, to, reason: reason || 'ok' });
}

export function transitionRide(ride: RideState, next: RideStatus): RideState {
    const allowed = LEGAL_TRANSITIONS[ride.status];
    if (!allowed || !allowed.includes(next)) {
        throw new Error(`ILLEGAL TRANSITION: Cannot move Ride ${ride.rideId} from ${ride.status} to ${next}`);
    }

    const nextState: RideState = {
        ...ride,
        status: next,
        timestamps: { ...ride.timestamps },
        pendingConsents: ride.pendingConsents ? { ...ride.pendingConsents } : undefined
    };

    const now = Clock.now();
    switch (next) {
        case "CONSENT_PENDING": nextState.timestamps.consentStartedAt = now; break;
        case "PRICE_LOCKED": nextState.timestamps.priceLockedAt = now; break;
        case "POOLED_ACTIVE":
            nextState.timestamps.pooledStartedAt = now;
            delete nextState.pendingConsents;
            break;
        case "COMPLETED": nextState.timestamps.completedAt = now; break;
        case "ABORTED":
            nextState.timestamps.abortedAt = now;
            nextState.pendingConsents = {};
            break;
    }

    logTransition(ride.rideId, ride.status, next);
    return nextState;
}

export function createRide(id: string, driver: Driver, primaryRider: Rider, initialRoute: LatLng[], cityCode: string = "DEFAULT"): RideState {
    const seed = parseInt(crypto.createHash('md5').update(id).digest('hex').substring(0, 8), 16);
    return {
        rideId: id,
        cityCode,
        status: "IDLE",
        route: initialRoute,
        riders: [primaryRider],
        stops: [
            { id: `${primaryRider.id}-P`, riderId: primaryRider.id, location: primaryRider.pickup, type: 'PICKUP' },
            { id: `${primaryRider.id}-D`, riderId: primaryRider.id, location: primaryRider.destination, type: 'DROPOFF' }
        ],
        driver,
        timestamps: { createdAt: Clock.now() },
        simulationSeed: seed
    };
}

export function initiateConsent(ride: RideState, simulationResult: SimulationResult, candidate: Rider): RideState {
    if (!CONFIG.POOLING_ENABLED) throw new Error("Pooling disabled");
    if (!ride.status.match(/SOLO_ACTIVE|POOL_CANDIDATE|POOLED_ACTIVE/)) throw new Error(`Invalid state: ${ride.status}`);

    const transitionedState = transitionRide(ride, "CONSENT_PENDING");
    const { proposedRoute } = simulationResult;
    const tokens: Record<string, ConsentToken> = {};

    for (const r of ride.riders) {
        tokens[r.id] = createConsentToken(ride.rideId, r.id, r.currentFare || 0, proposedRoute);
    }
    tokens[candidate.id] = createConsentToken(ride.rideId, candidate.id, candidate.currentFare || 0, proposedRoute);
    tokens[ride.driver.id] = createConsentToken(ride.rideId, ride.driver.id, 0, proposedRoute);

    transitionedState.pendingConsents = tokens;
    transitionedState.lastSimulationResult = simulationResult;
    transitionedState.pendingCandidate = candidate;

    count('consent_initiated', { rideId: ride.rideId });
    return transitionedState;
}

export function commitRide(ride: RideState): RideState {
    if (ride.status !== "CONSENT_PENDING") throw new Error("Not in consent pending");
    if (!ride.pendingConsents || !ride.lastSimulationResult) {
        return transitionRide(transitionRide(ride, "ABORTED"), "SOLO_ACTIVE");
    }

    const { proposedRoute, riderMetrics, capacity } = ride.lastSimulationResult;

    // 1. Re-validate Consents
    for (const rider of ride.riders) {
        const token = ride.pendingConsents[rider.id];
        const res = validateConsentToken(token, rider.currentFare || 0, proposedRoute);
        if (!res.valid) return transitionRide(transitionRide(ride, "ABORTED"), "SOLO_ACTIVE");
    }
    const driverRes = validateConsentToken(ride.pendingConsents[ride.driver.id], 0, proposedRoute);
    if (!driverRes.valid) return transitionRide(transitionRide(ride, "ABORTED"), "SOLO_ACTIVE");

    // 2. Re-check Invariants
    const snapshot: InvariantSnapshot = {
        riders: riderMetrics.map(rm => ({ ...rm, isConsentValid: true, isSafePickup: true })),
        driver: { earning: 200, baseEarning: 100 },
        platform: { margin: 50 },
        capacity,
        cityConfig: getEffectiveCityConfig(ride.cityCode, Clock.now())
    };

    const invCheck = assertInvariants(snapshot);
    if (!invCheck.success) {
        logTransition(ride.rideId, ride.status, "ABORTED", (invCheck as any).reason);
        return transitionRide(transitionRide(ride, "ABORTED"), "SOLO_ACTIVE");
    }

    // 3. COMMIT
    let state = transitionRide(transitionRide(ride, "PRICE_LOCKED"), "POOLED_ACTIVE");
    state.route = proposedRoute;

    // Update existing riders with their new deterministic detours
    state.riders = ride.riders.map(r => {
        const m = riderMetrics.find(rm => rm.id === r.id);
        return { ...r, currentDetourSec: m ? m.detourSec : r.currentDetourSec };
    });

    if (ride.pendingCandidate) {
        const m = riderMetrics.find(rm => rm.id === ride.pendingCandidate.id);
        state.riders.push({
            ...ride.pendingCandidate,
            status: 'MATCHED',
            currentDetourSec: m ? m.detourSec : 180
        });
        state.stops = ride.lastSimulationResult.proposedStops;
        delete state.pendingCandidate;
    }

    count('commit_success', { rideId: ride.rideId });
    return state;
}


/**
 * Command API Boundaries -- Step 2 (Production Infrastructure)
 * 
 * Defines the strict commands allowed to mutate the system.
 * Prevents "PATCH /state" anti-patterns.
 * 
 * Flow:
 * Client -> Command API -> Validation -> Core Invariants -> DB Commit
 */

import { Rider, LatLng } from '../types';
import { RecommendationContext } from '../core/recommendation';

export type CommandResult<T> =
    | { success: true; data: T; meta: { rideId: string, timestamp: number } }
    | { success: false; error: string; code: string; meta: { rideId: string, timestamp: number } };

// --- 1. Simulation Command ---
export interface SimulateRideCommand {
    type: 'SIMULATE_RIDE';
    riderId: string;
    rideId: string; // Idempotency
    pickup: LatLng;
    destination: LatLng;
    cityCode: string; // For config resolution
    context: RecommendationContext;
}

export interface SimulationResponse {
    proposedRouteMatches: any[]; // Ideally strict types from simulation
    pricing: {
        baseFare: number;
        surgeMultiplier: number;
    };
    recommendation: {
        suggestion: string;
        confidence: number;
    };
}

// --- 2. Consent Command ---
export interface InitiateConsentCommand {
    type: 'INITIATE_CONSENT';
    rideId: string;
    riderId: string;
    selectedRouteHash: string; // Critical: Must match simulation
    agreedPrice: number;
}

export interface ConsentResponse {
    consentToken: string; // Signed JWT or DB Token ID
    expiresAt: number;
    status: 'PENDING_MATCH';
}

// --- 3. Commit Command ---
export interface CommitRideCommand {
    type: 'COMMIT_RIDE';
    rideId: string;
    consentToken: string; // Proof of agreement
}

export interface CommitResponse {
    status: 'POOLED_ACTIVE' | 'SOLO_ACTIVE'; // Fallback possible
    finalRoute: LatLng[];
    driverId?: string;
}

// --- Union Type for Handler ---
export type RideCommand =
    | SimulateRideCommand
    | InitiateConsentCommand
    | CommitRideCommand;

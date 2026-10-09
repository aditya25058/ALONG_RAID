
import { RideState, transitionRide, commitRide, initiateConsent, RideStatus } from './stateMachine';
import { simulateInsertC } from './simulation';
import { Rider, Driver, Vehicle } from '../types';
import { count } from './metrics';
import { Clock } from './time';
import * as crypto from 'crypto';
import { ChaosEngine } from './ChaosEngine';

// --- COMMAND DTOS ---

export type CommandType =
    | 'SIMULATE_POOL_JOIN'
    | 'INITIATE_CONSENT'
    | 'SUBMIT_CONSENT'
    | 'COMMIT_POOL'
    | 'ABORT_RIDE';

export interface BaseCommand {
    type: CommandType;
    requestId: string; // For idempotency
    actorId: string;
}

export interface SimulatePoolJoinCommand extends BaseCommand {
    type: 'SIMULATE_POOL_JOIN';
    rideId: string;
    candidate: Rider;
    chaosProfileId?: string; // NEW
}

export interface InitiateConsentCommand extends BaseCommand {
    type: 'INITIATE_CONSENT';
    rideId: string;
    candidateId: string;
}

export interface SubmitConsentCommand extends BaseCommand {
    type: 'SUBMIT_CONSENT';
    rideId: string;
    token: string; // The signed consent token
}

export interface CommitPoolCommand extends BaseCommand {
    type: 'COMMIT_POOL';
    rideId: string;
}

export type Command =
    | SimulatePoolJoinCommand
    | InitiateConsentCommand
    | SubmitConsentCommand
    | CommitPoolCommand;

// --- COMMAND BUS / ROUTER ---

// Mock Database / State Store
const RIDE_STORE: Record<string, RideState> = {};
const PROCESSED_REQUESTS = new Set<string>();

import { db } from '../services/dbService';

/**
 * THE BRAIN STEM (ONE DOOR IN)
 * Coordinates State Loading, Simulation, Invariant Guarding, and Atomic Commit.
 */
const RULES_VERSION = "v1.2.0-deterministic";

export async function executeCommand(cmd: Command): Promise<{ success: boolean; state?: any; error?: string }> {
    const commandHash = calculateCanonicalHash(cmd);
    const rulesFingerprint = crypto.createHash('sha256').update(RULES_VERSION).digest('hex');

    try {
        // 1. ELITE IDEMPOTENCY: Check Second Judge for existing result
        const existing = await db.getProcessedCommand(cmd.requestId);
        if (existing) {
            if (existing.command_hash !== commandHash) {
                return { success: false, error: "COMMAND_TAMPERED (Payload mismatch for same requestId)" };
            }
            return existing.result;
        }

        // 2. AUTHORITATIVE STATE: Load from DB Truth
        const rideId = (cmd as any).rideId || 'SYSTEM';
        const rideFromDb = await db.loadRide(rideId);

        // Mocking RideState from DB for the transition (In a real system, we'd map DB result to RSM State)
        const currentRideState: RideState = RIDE_STORE[rideId] || rideFromDb;

        if (!currentRideState && rideId !== 'SYSTEM') {
            return { success: false, error: "RIDE_NOT_FOUND" };
        }

        // 3. ATOMIC COMMIT (Judge 2 - DB Enforcement)
        return await db.executeAtomicCommand(
            cmd.requestId,
            cmd.actorId,
            rideId,
            cmd,
            async (client) => {
                let result: { success: boolean; state?: any; error?: string };

                // 4. PURE LOGIC: State Machine & Simulation
                switch (cmd.type) {
                    case 'SIMULATE_POOL_JOIN':
                        result = await handleSimulate(cmd);
                        break;
                    case 'INITIATE_CONSENT':
                        result = handleInitiateConsent(cmd);
                        break;
                    case 'COMMIT_POOL':
                        result = handleCommit(cmd);
                        break;
                    default:
                        return { success: false, error: "UNKNOWN_COMMAND_TYPE" };
                }

                if (!result.success) return result;

                // 5. SECOND JUDGE: Persist mutated reality
                if (result.state) {
                    const nextState = result.state as RideState;
                    await client.query(
                        `UPDATE rides SET 
                            status = $2, 
                            route_hash = $3, 
                            pricing_json = $4,
                            simulation_seed = $5,
                            updated_at = CURRENT_TIMESTAMP
                         WHERE ride_id = $1`,
                        [
                            rideId,
                            nextState.status,
                            nextState.lastSimulationResult?.proposedRoute?.length.toString() || '0',
                            JSON.stringify(nextState.pricing || {}),
                            nextState.simulationSeed || 0
                        ]
                    );
                }

                return result;
            }
        );

    } catch (e: any) {
        count('command_error', { type: cmd.type, error: e.message });
        return { success: false, error: `BRAIN_STEM_FAILURE: ${e.message}` };
    }
}

/**
 * ELITE REPLAY PROTECTION: Canonical Hashing
 * Ensures identical results regardless of key order or non-essential drift.
 */
function calculateCanonicalHash(obj: any): string {
    const canonicalStr = JSON.stringify(sortKeys(obj));
    return crypto.createHash('sha256').update(canonicalStr).digest('hex');
}

function sortKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);

    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = sortKeys(obj[key]);
    });
    return sorted;
}

// --- HANDLERS ---

async function handleSimulate(cmd: SimulatePoolJoinCommand) {
    const ride = RIDE_STORE[cmd.rideId];
    if (!ride) return { success: false, error: "Ride not found" };

    // Note: In real system, we'd fetch driver/vehicle from DB
    // Here we assume they are accessible or passed for mock.
    const vehicle: Vehicle = {
        id: ride.driver.vehicleId,
        driverId: ride.driver.id,
        type: (ride.driver as any).type || 'SEDAN',
        seatsAvailable: 4,
        bootUnitsAvailable: 3,
        totalSeats: 4,
        totalBootUnits: 3,
        currentRoute: [],
        currentLegIndex: 0,
        profitabilityScore: 1
    } as any;

    // 2. RESOLVE CHAOS (The Bangalore Standard)
    const profile = ChaosEngine.getProfile(cmd.chaosProfileId);
    const fingerprint = ChaosEngine.getFingerprint(profile, ride.simulationSeed);

    const context = {
        riderId: cmd.candidate.id,
        chaosProfile: profile,
        chaosProfileFingerprint: fingerprint
    } as any;

    const simResult = await simulateInsertC(ride, cmd.candidate, vehicle, context);

    if (!simResult.invariantResult.success) {
        console.error(`[COMMAND] Simulation Invariant Failure: ${(simResult.invariantResult as any).reason}`);
        return { success: false, error: `Invariant Violation: ${(simResult.invariantResult as any).reason}` };
    }

    // store simulation result in ride for next step
    ride.lastSimulationResult = simResult;
    ride.pendingCandidate = cmd.candidate;

    return { success: true, state: simResult };
}

function handleInitiateConsent(cmd: InitiateConsentCommand) {
    const ride = RIDE_STORE[cmd.rideId];
    if (!ride) return { success: false, error: "Ride not found" };
    if (!ride.lastSimulationResult || !ride.pendingCandidate) {
        return { success: false, error: "No active simulation for this ride" };
    }

    // executeCommand logic: Only it calls initiateConsent
    const nextState = initiateConsent(ride, ride.lastSimulationResult, ride.pendingCandidate);
    RIDE_STORE[cmd.rideId] = nextState;

    return { success: true, state: nextState };
}

function handleCommit(cmd: CommitPoolCommand) {
    const ride = RIDE_STORE[cmd.rideId];
    if (!ride) return { success: false, error: "Ride not found" };

    // executeCommand logic: Only it calls commitRide
    const nextState = commitRide(ride);
    RIDE_STORE[cmd.rideId] = nextState;

    return { success: true, state: nextState };
}

// Admin / Test Helpers
export function seedRide(state: RideState) {
    RIDE_STORE[state.rideId] = state;
}

export function getRide(id: string) {
    return RIDE_STORE[id];
}

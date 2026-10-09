
/**
 * ALONG API CONTRACT (Frozen)
 * 
 * This file is the SINGLE SOURCE OF TRUTH for the Frontend.
 * Any change here is a Breaking Change and requires a version bump.
 * 
 * DESIGN:
 * - Re-exports internal types to form a public surface area.
 * - Frontend should ONLY import from here, never from core/.
 */

// 1. Domain States
export type { RideStatus } from '../core/stateMachine';

// 2. Failure Codes (Regulator Approved)
export { RideFailureCode } from '../types';

// 3. Command Inputs (Strict)
export type {
    SimulateRideCommand,
    InitiateConsentCommand,
    CommitRideCommand,
    CancelRideCommand,
    UpdateLocationCommand
} from './commands';

// 4. Command Outputs
// (Defining explicit response shapes here if not already defined)

export interface ApiError {
    code: string; // e.g. "RideFailureCode"
    message: string;
    correlationId: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}


/**
 * Ride Lifecycle Orchestrator - Phase J
 * 
 * This file implements the "LAW" for Ride Commitment and Payments.
 * 
 * LAW #1: Capture MUST be Post-Commit Only.
 * LAW #2: Ride Commit MUST be SERIALIZABLE.
 * LAW #3: Failures MUST release funds.
 */

import { RideState, commitRide } from './stateMachine';
import { capturePayment, releasePayment } from './paymentFlow';
import { count } from './metrics';

/**
 * commitRideWithPayment: The Gold Standard Orchestrator.
 * 
 * Pattern:
 * 1. [TX] Start Serializable Transaction
 * 2. [TX] Validate & Commit Ride State
 * 3. [TX] End Transaction (Atomic Success)
 * 4. [EFFECT] Capture Payment (Outside TX)
 */
export async function commitRideWithPayment(
    ride: RideState,
    paymentId?: string
): Promise<{ success: boolean; state?: RideState; error?: string }> {

    let committedState: RideState | undefined;

    try {
        // --- STEP 1: RIDE COMMIT (THE DECISION) ---
        // In a real DB: BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE
        // We call commitRide which validates consents and invariants.
        committedState = commitRide(ride);

        // In a real DB: COMMIT (The ride is now POOLED_ACTIVE in the DB)
        count('ride_commit_success', { rideId: ride.rideId });

    } catch (e: any) {
        // --- STEP 2: ROLLBACK & RELEASE ---
        // If the ride commit fails for ANY reason (Invariant, Constraint, etc.):
        // We MUST release the held money.
        if (paymentId) {
            await releasePayment(paymentId);
        }
        count('ride_commit_aborted', { reason: e.message });
        return { success: false, error: e.message };
    }

    // --- STEP 3: CAPTURE (THE EFFECT) ---
    // Rule: Capture must NEVER happen inside the transaction.
    // If capture fails, the ride is still valid (POOLED_ACTIVE).
    // We flag for manual recovery/retry.
    if (paymentId) {
        const capture = await capturePayment(paymentId);
        if (!capture.success) {
            // CRITICAL: Ride is committed, but money movement failed.
            // Raise Alert. Do not fail the ride.
            console.error(`[CRITICAL] Ride ${ride.rideId} committed but Capture failed: ${capture.error}`);
            count('payment_capture_critical_fail', { rideId: ride.rideId });
            // In a real system: Queue for reliable retry or Ops alert.
        }
    }

    return { success: true, state: committedState };
}

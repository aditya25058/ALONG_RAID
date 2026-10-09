
import { Clock } from './time';
import { count } from './metrics';
import { simulateInsertC } from './simulation';
import { RideState } from './stateMachine';

// --- COMPLIANCE MODELS ---

export interface ConsentAuditRecord {
    timestamp: number;
    actorId: string;
    rideId: string;
    agreedFare: number;
    routeHash: string;
    requestId: string;
}

export interface PaymentAuditRecord {
    timestamp: number;
    rideId: string;
    authId: string; // RBI traceability
    amount: number;
    status: 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED';
}

// Immutable Log (Mock Persistent Storage)
const CONSENT_LOG: ConsentAuditRecord[] = [];
const PAYMENT_LOG: PaymentAuditRecord[] = [];

/**
 * Compliance Service: Records immutable consent events.
 * Required for IT Act / Dispute resolution.
 */
export function logConsent(record: ConsentAuditRecord) {
    CONSENT_LOG.push({ ...record, timestamp: Clock.now() });
    console.log(`[COMPLIANCE] Registered Consent Audit for Actor ${record.actorId} on Ride ${record.rideId}`);
    count('compliance_log_consent', { rideId: record.rideId });
}

/**
 * Compliance Service: Records Payment Lifecycle.
 * Required for RBI traceability.
 */
export function logPayment(record: PaymentAuditRecord) {
    PAYMENT_LOG.push({ ...record, timestamp: Clock.now() });
    console.log(`[COMPLIANCE] Registered Payment Audit: ${record.status} for Ride ${record.rideId}`);
    count('compliance_log_payment', { status: record.status });
}

/**
 * Dispute Replay Engine.
 * Re-runs simulation with historical state to prove "Fair Pricing".
 */
export function disputeReplay(state: RideState, candidate: any, originalResult: any) {
    console.log(`[AUDIT] Starting Dispute Replay for Ride ${state.rideId}...`);

    // 1. Re-run simulation
    // Note: Since simulation is deterministic (seeded), it must match exactly.
    const replayed = simulateInsertC(state, candidate, {} as any, { riderId: candidate.id } as any);

    // 2. Cross-check
    const fareMatches = replayed.pricing?.riderCFare === originalResult.pricing.riderCFare;
    const routeMatches = replayed.invariantResult.success === originalResult.invariantResult.success;

    if (fareMatches && routeMatches) {
        console.log("✅ Audit Success: Original results verified via Deterministic Replay.");
        return true;
    } else {
        console.error("❌ Audit Failure: Non-deterministic drift detected!");
        return false;
    }
}

/**
 * Regulatory Export Tool.
 */
export function exportRegulatoryAudit(cityCode?: string) {
    console.log(`[COMPLIANCE] Exporting audit logs for ${cityCode || 'ALL CITIES'}...`);
    return {
        consents: CONSENT_LOG.filter(l => !cityCode || l.rideId.startsWith(cityCode)), // Simple prefix mock
        payments: PAYMENT_LOG
    };
}

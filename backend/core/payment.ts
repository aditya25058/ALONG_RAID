
/**
 * Payment Core Definitions - Phase J
 * 
 * Money must obey the same laws as rides:
 * - Deterministic
 * - Idempotent
 * - Auditable
 * - Reversible
 */

import { Clock } from './time';

// --- Payment Status Machine ---
export type PaymentStatus =
    | "NONE"
    | "AUTHORIZED" // Money Held
    | "CAPTURED"   // Money Taken
    | "RELEASED"   // Money Returned/Voided
    | "FAILED";    // Technical Failure

// --- Payment State ---
export interface PaymentState {
    paymentId: string;
    rideId: string;
    riderId: string;

    // Financials
    amount: number; // Integers (cents/paise) to avoid float math
    currency: "INR";

    status: PaymentStatus;

    // Lineage & Idempotency
    paymentCommandId: string; // Critical for Idempotency
    provider: "RAZORPAY" | "STRIPE" | "MOCK";
    providerRef?: string; // External ID

    // Audit
    createdAt: number;
    updatedAt: number;
}

// --- Payment Consent ---
export interface PaymentConsentToken {
    rideId: string;
    riderId: string;
    paymentCommandId: string; // Link to specific payment attempt

    agreedAmount: number;
    agreedCurrency: "INR";

    expiresAt: number;
    createdAt: number;
}

// --- Factory for Consent ---
const PAYMENT_CONSENT_TTL_MS = 60_000; // 1 minute to authorize

export function createPaymentConsent(
    rideId: string,
    riderId: string,
    amount: number,
    commandId: string
): PaymentConsentToken {
    const now = Clock.now();
    return {
        rideId,
        riderId,
        paymentCommandId: commandId,
        agreedAmount: amount,
        agreedCurrency: "INR",
        createdAt: now,
        expiresAt: now + PAYMENT_CONSENT_TTL_MS
    };
}

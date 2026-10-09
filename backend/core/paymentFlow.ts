
/**
 * Payment Flow - Phase J
 * 
 * The Heart of Money Safety.
 * 
 * Lifecycle:
 * 1. Authorize (Hold Funds) -> PENDING COMMIT
 * 2. Commit Ride (Atomic) -> RIDE COMMITTED
 * 3. Capture (Take Funds) -> MONEY MOVED
 * 
 * Failure in 2 -> Release Authorization.
 */

import { PaymentState, PaymentConsentToken, createPaymentConsent, PaymentStatus } from './payment';
import { CONFIG } from './config';
import { Clock } from './time';
import { count } from './metrics';

// --- In-Memory DB (Simulated for Phase J) ---
// In production, this hits the 'payments' table in PostgreSQL.
const PAYMENTS_DB = new Map<string, PaymentState>();
const COMMAND_IDEMPOTENCY = new Map<string, string>(); // CommandID -> PaymentID

/**
 * AUTHORIZE: Holds the money.
 * Must be called BEFORE Ride Commit.
 */
export async function authorizePayment(
    consent: PaymentConsentToken,
    mockProviderRef: string = "pay_mock_ref"
): Promise<{ success: boolean; payment?: PaymentState; error?: string }> {

    // 1. Kill Switch Check
    if (!CONFIG.PAYMENTS_ENABLED) {
        return { success: false, error: "Payments Disabled by Kill Switch" };
    }

    // 2. Validate Consent
    const now = Clock.now();
    if (now > consent.expiresAt) {
        count('payment_auth_failed', { reason: 'expired_consent' });
        return { success: false, error: "Consent Expired" };
    }

    // 3. Idempotency Check
    if (COMMAND_IDEMPOTENCY.has(consent.paymentCommandId)) {
        const existingId = COMMAND_IDEMPOTENCY.get(consent.paymentCommandId)!;
        const existing = PAYMENTS_DB.get(existingId);
        if (existing) {
            count('payment_idempotent_hit', { type: 'auth' });
            return { success: true, payment: existing };
        }
    }

    // 4. Safety Limits
    if (consent.agreedAmount > CONFIG.MAX_HOLD_AMOUNT) {
        count('payment_auth_failed', { reason: 'amount_too_high' });
        return { success: false, error: "Amount exceeds safety limit" };
    }

    // 5. Create Payment Record (Pending/Authorized)
    // In real DB: INSERT INTO payments (status='AUTHORIZED')
    const paymentId = `pay_${now}_${Math.random().toString(36).substr(2, 5)}`;

    const payment: PaymentState = {
        paymentId,
        rideId: consent.rideId,
        riderId: consent.riderId,
        status: "AUTHORIZED",
        amount: consent.agreedAmount,
        currency: consent.agreedCurrency,
        paymentCommandId: consent.paymentCommandId,
        provider: "MOCK", // Or Stripe/Razorpay
        providerRef: mockProviderRef,
        createdAt: now,
        updatedAt: now
    };

    // 6. Persist
    PAYMENTS_DB.set(paymentId, payment);
    COMMAND_IDEMPOTENCY.set(consent.paymentCommandId, paymentId);

    count('payment_authorized', { currency: 'INR' });
    return { success: true, payment };
}

/**
 * CAPTURE: Moves the money.
 * Must be called AFTER Ride Commit.
 * STRICTLY POST-COMMIT.
 */
export async function capturePayment(paymentId: string): Promise<{ success: boolean; payment?: PaymentState; error?: string }> {

    // 1. Fetch Payment
    const payment = PAYMENTS_DB.get(paymentId);
    if (!payment) {
        return { success: false, error: "Payment Not Found" };
    }

    // 2. State Check (The Judge)
    if (payment.status === "CAPTURED") {
        return { success: true, payment }; // Idempotent success
    }
    if (payment.status !== "AUTHORIZED") {
        return { success: false, error: `Illegal Capture: Status is ${payment.status}` };
    }

    // 3. Kill Switch (Operational Safety)
    // We can disable capture but keep rides running (free rides vs outage).
    if (!CONFIG.CAPTURE_ENABLED) {
        count('payment_capture_skipped', { reason: 'kill_switch' });
        // We do NOT fail. We just don't capture yet. 
        // Or do we return success but leave it authorized? 
        // User requirements say "Capture fails -> Flag + Manual Recovery".
        return { success: false, error: "Capture Disabled by Kill Switch" };
    }

    // 4. Execute Capture (Mock)
    // In real ID: Stripe.capture(payment.providerRef)

    // 5. Update State
    payment.status = "CAPTURED";
    payment.updatedAt = Clock.now();
    PAYMENTS_DB.set(paymentId, payment);

    count('payment_captured', { amount: payment.amount.toString() });
    return { success: true, payment };
}

/**
 * RELEASE: Voids the authorization.
 * Called if Ride Commit fails or Ride Aborts.
 */
export async function releasePayment(paymentId: string): Promise<{ success: boolean; payment?: PaymentState }> {
    const payment = PAYMENTS_DB.get(paymentId);
    if (!payment) return { success: false };

    if (payment.status === "CAPTURED") {
        // Too late to release! Need refund.
        return { success: false };
    }

    if (payment.status === "RELEASED") return { success: true, payment };

    payment.status = "RELEASED";
    payment.updatedAt = Clock.now();
    PAYMENTS_DB.set(paymentId, payment);

    count('payment_released', { reason: 'abort_or_fail' });
    return { success: true, payment };
}

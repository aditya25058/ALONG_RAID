
/**
 * Payment Safety Verification - Phase J
 * 
 * Testing Money Laws:
 * 1. Capture MUST follow Commit.
 * 2. Idempotency is strict.
 * 3. Failures release funds.
 */

import { authorizePayment, capturePayment, releasePayment } from '../paymentFlow';
import { createPaymentConsent, PaymentConsentToken } from '../payment';
import { DeterministicTimeProvider, setClock } from '../time';
import { CONFIG } from '../config';

// Setup Time
const clock = new DeterministicTimeProvider(1000000000);
setClock(clock);

const rideId = "ride_pay_test";
const riderId = "rider_pay_test";
const amount = 5000; // ₹50.00
const commandId = "cmd_12345";

console.log("--- PAYMENT SAFETY TESTS ---");

async function runTests() {
    // 1. Happy Path: Auth -> Commit -> Capture
    console.log("\n[SCENARIO 1] Standard Lifecycle");
    const consent = createPaymentConsent(rideId, riderId, amount, commandId);

    // A. Authorize
    const auth = await authorizePayment(consent);
    if (!auth.success || auth.payment?.status !== "AUTHORIZED") {
        console.error("[FAIL] Authorization Failed", auth);
        process.exit(1);
    }
    console.log("[PASS] Payment Authorized.");

    // B. Simulate Commit Success (Ride State Machine would run here)
    const commitSuccess = true;

    // C. Capture (Post-Commit)
    if (commitSuccess) {
        const cap = await capturePayment(auth.payment!.paymentId);
        if (!cap.success || cap.payment?.status !== "CAPTURED") {
            console.error("[FAIL] Capture Failed", cap);
            process.exit(1);
        }
        console.log("[PASS] Payment Captured.");
    }

    // 2. Idempotency (Double Auth)
    console.log("\n[SCENARIO 2] Idempotency (Repetitive Auth)");
    const retryAuth = await authorizePayment(consent);
    if (retryAuth.success && retryAuth.payment?.paymentId === auth.payment!.paymentId) {
        console.log("[PASS] Idempotent Auth (Returned same Payment ID).");
    } else {
        console.error("[FAIL] Idempotency Failed", retryAuth);
        process.exit(1);
    }

    // 3. Commit Failure -> Release
    console.log("\n[SCENARIO 3] Commit Failure -> Release");
    const cmdFail = "cmd_fail_commit";
    const consentFail = createPaymentConsent(rideId, riderId, amount, cmdFail);

    const authFail = await authorizePayment(consentFail);
    if (!authFail.success) throw new Error("Setup failed");

    // Simulate Commit Failure
    const commitFailed = true;
    if (commitFailed) {
        const released = await releasePayment(authFail.payment!.paymentId);
        if (released.success && released.payment?.status === "RELEASED") {
            console.log("[PASS] Funds Released on Commit Failure.");
        } else {
            console.error("[FAIL] Release Failed", released);
            process.exit(1);
        }
    }

    // 4. Kill Switch Awareness
    console.log("\n[SCENARIO 4] Kill Switch (No Capture)");
    CONFIG.CAPTURE_ENABLED = false;

    const cmdKill = "cmd_kill_switch";
    const consentKill = createPaymentConsent(rideId, riderId, amount, cmdKill);
    const authKill = await authorizePayment(consentKill);

    const capKill = await capturePayment(authKill.payment!.paymentId);
    if (!capKill.success && capKill.error?.includes("Disabled")) {
        console.log("[PASS] Capture blocked by Kill Switch.");
    } else {
        console.error("[FAIL] Kill Switch ignored", capKill);
        process.exit(1);
    }

    CONFIG.CAPTURE_ENABLED = true; // Restore

    console.log("\n--- ALL PAYMENT TESTS PASSED ---");
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

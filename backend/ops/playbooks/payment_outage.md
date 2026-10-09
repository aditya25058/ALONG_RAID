# Playbook: Payment Provider Outage (P0/P1)

## Trigger Signals
- `payment_authorize_failures` > 5 within 1 minute.
- `payment_capture_failures` > 2 within 1 minute.
- Provider API latency > 5s.

## Immediate Actions (Kill Switch Matrix)
1. **Set `CAPTURE_ENABLED = false`** in `backend/core/config.ts`.
   - *Result*: Rides continue to pool, but money movement is deferred to avoid blocking the user flow with errors.
2. **Verify Authorization Status**.
   - If `AUTHORIZED` is also failing, set `PAYMENTS_ENABLED = false`.
   - *Result*: System reverts to Solo logic or disables pooling depending on policy.

## User Impact
- Rides continue as normal.
- Payments will be settled later via reconciliation jobs.
- No "Payment Failed" errors during the ride lifecycle.

## Recovery Steps
1. Verify provider stability (Stripe/Razorpay status page).
2. **Re-enable `CAPTURE_ENABLED = true`**.
3. Trigger `Payment Reconciliation Job` to capture any pending `AUTHORIZED` payments.

## Forbidden Actions
- ❌ **Do not** manually edit the `payments` table rows.
- ❌ **Do not** retry capture blindly without verifying provider connectivity.
- ❌ **Do not** attempt to "fix" provider API issues with code patches.

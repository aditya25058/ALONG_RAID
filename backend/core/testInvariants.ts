
import { assertInvariants, InvariantSnapshot } from './invariants';

const mockState: InvariantSnapshot = {
    riderA: { fare: 50, soloFare: 60 },
    riderC: { fare: 40, soloFare: 50, isConsentValid: true, isSafePickup: true },
    driver: { earning: 120, baseEarning: 100 },
    platform: { margin: 10 },
    detourSeconds: 300
};

function test(name: string, stateUpdate: Partial<InvariantSnapshot> | any, expectedSuccess: boolean, expectedCode?: string) {
    const state = JSON.parse(JSON.stringify(mockState));

    // Deep merge for simple nested objects
    for (const key in stateUpdate) {
        if (typeof stateUpdate[key] === 'object' && stateUpdate[key] !== null) {
            Object.assign(state[key], stateUpdate[key]);
        } else {
            state[key] = stateUpdate[key];
        }
    }

    const result = assertInvariants(state);
    if (result.success === expectedSuccess) {
        if (!expectedSuccess && result.success === false && result.code !== expectedCode) {
            console.error(`[FAIL] ${name}: Expected code ${expectedCode}, got ${result.code}`);
            process.exit(1);
        }
        console.log(`[PASS] ${name}`);
    } else {
        console.error(`[FAIL] ${name}: Expected success=${expectedSuccess}, got ${result.success} (${result.success === false ? result.reason : ''})`);
        process.exit(1);
    }
}

console.log('--- Testing Core Invariants ---');

test('Baseline Valid', {}, true);

test('Consent Invalid', { riderC: { isConsentValid: false, fare: 40, soloFare: 50, isSafePickup: true } }, false, 'CONSENT_EXPIRED');

test('Unsafe Pickup', { riderC: { isSafePickup: false, fare: 40, soloFare: 50, isConsentValid: true } }, false, 'UNSAFE_PICKUP');

test('Time Violation', { detourSeconds: 601 }, false, 'TIME_VIOLATION');

test('Rider A Overpay', { riderA: { fare: 70, soloFare: 60 } }, false, 'RIDER_A_OVERPAY');

test('Rider C No Savings', { riderC: { fare: 50, soloFare: 50, isConsentValid: true, isSafePickup: true } }, false, 'RIDER_C_NO_SAVINGS');

test('Driver Loss', { driver: { earning: 90, baseEarning: 100 } }, false, 'DRIVER_LOSS');

test('Platform Negative Margin', { platform: { margin: -1 } }, false, 'NEGATIVE_MARGIN');

console.log('--- All Tests Passed ---');

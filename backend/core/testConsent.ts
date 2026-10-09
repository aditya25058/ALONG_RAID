
import { createConsentToken, validateConsentToken, hashRoute, ConsentToken } from './consent';
import { LatLng } from '../types';

console.log("--- Testing Consent Logic ---");

// Mocks
const rideId = "ride_123";
const actorId = "rider_A";
const route: LatLng[] = [{ lat: 10, lng: 10 }, { lat: 11, lng: 11 }];
const price = 100.00;

// 1. Test Factory
const token = createConsentToken(rideId, actorId, price, route, 5000);
if (token.rideId === rideId && token.agreedPrice === price && token.expiresAt > Date.now()) {
    console.log("[PASS] Token creation valid");
} else {
    console.log("[FAIL] Token creation invalid");
    process.exit(1);
}

// 2. Test Hashing Stability
const hash1 = hashRoute(route);
const hash2 = hashRoute([{ lat: 10.000001, lng: 10 }, { lat: 11, lng: 11 }]); // Approx same? 0.000001 deg ~0.1m, toFixed(5) should catch this?
// toFixed(5) means 10.00000. So 10.000001 -> "10.00000".
// Let's test sensitivity.
const routeDiff = [{ lat: 10.0001, lng: 10 }, { lat: 11, lng: 11 }]; // ~11m diff
const hashDiff = hashRoute(routeDiff);

if (hash1 === hashRoute(route)) {
    console.log("[PASS] Hash stable for identical input");
} else {
    console.log("[FAIL] Hash unstable");
    process.exit(1);
}

if (hash1 !== hashDiff) {
    console.log("[PASS] Hash sensitive to significant change (~10m)");
} else {
    console.log("[FAIL] Hash insensitive to change");
}

// 3. Test Validation Success
const validRes = validateConsentToken(token, price, route); // Now is now
if (validRes.valid) {
    console.log("[PASS] Validation succeeds for matching conditions");
} else {
    console.log(`[FAIL] Validation unexpected failure: ${JSON.stringify(validRes)}`);
    process.exit(1);
}

// 4. Test Price Drift
const invalidPriceRes = validateConsentToken(token, 100.02, route); // > 0.01 diff
if (!invalidPriceRes.valid && invalidPriceRes.reason === 'PRICE_MISMATCH') {
    console.log("[PASS] Price drift detected");
} else {
    console.log("[FAIL] Price check failed");
    process.exit(1);
}

// 5. Test Route Drift
const invalidRouteRes = validateConsentToken(token, price, routeDiff);
if (!invalidRouteRes.valid && invalidRouteRes.reason === 'ROUTE_MISMATCH') {
    console.log("[PASS] Route drift detected");
} else {
    console.log("[FAIL] Route check failed");
    process.exit(1);
}

// 6. Test Expiration
// Mock time locally for test
const expiredToken = { ...token, expiresAt: Date.now() - 1000 };
const expiredRes = validateConsentToken(expiredToken, price, route);
if (!expiredRes.valid && expiredRes.reason === 'EXPIRED') {
    console.log("[PASS] Expiration detected");
} else {
    console.log("[FAIL] Expiration check failed");
    process.exit(1);
}

console.log("--- All Tests Passed ---");

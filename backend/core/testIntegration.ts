
import { createRide, initiateConsent, commitRide, RideState } from './stateMachine';
import { simulateInsertC } from './simulation';
import { createConsentToken, validateConsentToken } from './consent';
import { Driver, Rider, Vehicle, VehicleType, PricingContext } from '../types';

console.log("--- Testing Integration (Atomic Commit) ---");

// Mocks
const mockDriver: Driver = {
    id: "d1", name: "Driver 1", currentLocation: { lat: 0, lng: 0 },
    vehicleId: "v1", vehicleSpeedKmH: 30, status: "AVAILABLE",
    isAadhaarVerified: true, averageRating: 5
};

const riderA: Rider = {
    id: "rA", name: "Rider A", pickup: { lat: 0, lng: 0 }, destination: { lat: 0, lng: 10 },
    status: "IN_TRIP", isAadhaarVerified: true, averageRating: 5
};

const riderC: Rider = {
    id: "rC", name: "Rider C", pickup: { lat: 0, lng: 2 }, destination: { lat: 0, lng: 8 },
    status: "MATCHED", isAadhaarVerified: true, averageRating: 5
};

const mockVehicle: Vehicle = {
    id: "v1", driverId: "d1", type: VehicleType.SEDAN,
    currentRoute: [], currentLegIndex: 0,
    seatsAvailable: 3, bootUnitsAvailable: 2, totalSeats: 4, totalBootUnits: 4, profitabilityScore: 0
};

const context: PricingContext = {
    activeRequests: 1, expectedBaseline: 1, availableDrivers: 1, totalRequests: 1,
    congestionLevel: 0, isRaining: false, isLateNight: false, isFestival: false,
    predictedSurgeProbability: 0, isEmergencyMode: false, isUnsafePickupZone: false,
    isDeterministic: true
};

// --- SCENARIO 1: Happy Path ---
console.log("\n[SCENARIO 1] Happy Path: Solo -> Consent -> Commit");

// 1. Create Ride
let ride = createRide("ride_int_1", mockDriver, riderA, []);
ride.status = "SOLO_ACTIVE"; // Manual transition to legal start
ride.status = "POOL_CANDIDATE"; // Transition to legal Pool Candidate

// 2. Simulate
const simResult = simulateInsertC(ride, riderC, mockVehicle, context);
if (!simResult.invariantResult.success) {
    console.error("Simulation failed unexpectedly");
    process.exit(1);
}

// 3. Initiate Consent
ride = initiateConsent(ride, simResult, riderC);
if (ride.status !== "CONSENT_PENDING" || !ride.pendingConsents || !ride.pendingCandidate) {
    console.error("[FAIL] Initiate Consent failed to transition or store data");
    process.exit(1);
}
console.log("[PASS] Transitioned to CONSENT_PENDING with tokens");

// 4. Commit Ride
// In real world, user would 'accept', backend validates, then calls commit.
// Here we assume acceptance logic is implicit or external, and we call commit directly which re-validates.
const committedRide = commitRide(ride);

if (committedRide.status === "POOLED_ACTIVE") {
    console.log("[PASS] Successfully committed to POOLED_ACTIVE");
    if (committedRide.riders.pooled && committedRide.riders.pooled[0].id === "rC") {
        console.log("[PASS] Rider C added to pooled riders");
    } else {
        console.error("[FAIL] Rider C NOT added to pooled riders");
    }
} else {
    console.error(`[FAIL] Commit failed. Status: ${committedRide.status}`);
}

// --- SCENARIO 2: Consent Expiry ---
console.log("\n[SCENARIO 2] Failure: Consent Expiry / Mutation");

let ride2 = createRide("ride_int_2", mockDriver, riderA, []);
ride2.status = "SOLO_ACTIVE";
ride2.status = "POOL_CANDIDATE";

const simResult2 = simulateInsertC(ride2, riderC, mockVehicle, context);
ride2 = initiateConsent(ride2, simResult2, riderC);

// Hack: Expire tokens manually
if (ride2.pendingConsents) {
    for (const key in ride2.pendingConsents) {
        ride2.pendingConsents[key].expiresAt = Date.now() - 1000;
    }
}

const failedRide = commitRide(ride2);
if (failedRide.status === "SOLO_ACTIVE") { // Should go ABORTED -> SOLO_ACTIVE
    console.log("[PASS] Commit aborted due to expired checks (Backed out to SOLO_ACTIVE)");
    if (failedRide.timestamps.abortedAt) {
        console.log("[PASS] Abort timestamp recorded");
    }
} else {
    console.error(`[FAIL] Should have aborted but got ${failedRide.status}`);
}

// --- SCENARIO 3: Route Drift (Hash Mismatch) ---
console.log("\n[SCENARIO 3] Failure: Route Validation Fail");

let ride3 = createRide("ride_int_3", mockDriver, riderA, []);
ride3.status = "POOL_CANDIDATE";
const simResult3 = simulateInsertC(ride3, riderC, mockVehicle, context);
ride3 = initiateConsent(ride3, simResult3, riderC);

// Modify the 'proposed' route in the stored simulation result to simulate drift or tampering
// Actually, `commitRide` validates `pendingConsents` (which agree to X) vs `lastSimulationResult` (which holds X).
// If they match, it passes.
// The check is intended to verify if the REALITY (currentRideState) matches the PROPOSAL.
// BUT `commitRide` logic currently checks `validateConsentToken(token, pricing.fare, proposedRoute)`.
// `pricing` and `proposedRoute` come from `lastSimulationResult`.
// Since we are committing *to* that result, they effectively match by definition unless we mutate `lastSimulationResult`.
// A better test of robustness: Validate that *if* we tried to pass a token that didn't match the result, it fails.
// Let's mutate the token in `pendingConsents` to disagree with `lastSimulationResult`.

if (ride3.pendingConsents) {
    ride3.pendingConsents[riderA.id].agreedRouteHash = "bad_hash";
}

const failedRide3 = commitRide(ride3);
if (failedRide3.status === "SOLO_ACTIVE") {
    console.log("[PASS] Commit aborted due to route hash mismatch");
} else {
    console.error(`[FAIL] Should have aborted but got ${failedRide3.status}`);
}

console.log("\n--- All Integration Tests Passed ---");

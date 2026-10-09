
import { createRide, transitionRide, RideState } from './stateMachine';
import { Driver, Rider, VehicleType } from '../types';

// Mock Data
const mockDriver: Driver = {
    id: "d1", name: "Driver 1", currentLocation: { lat: 0, lng: 0 },
    vehicleId: "v1", vehicleSpeedKmH: 40, status: "AVAILABLE",
    isAadhaarVerified: true, averageRating: 4.5
};

const mockRider: Rider = {
    id: "r1", name: "Rider 1", pickup: { lat: 0, lng: 0 }, destination: { lat: 1, lng: 1 },
    status: "ACTIVE", isAadhaarVerified: true, averageRating: 4.8
};

// Test Runner
function runTest(name: string, fn: () => void) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
    } catch (e: any) {
        console.error(`[FAIL] ${name}: ${e.message}`);
        process.exit(1);
    }
}

function expectError(name: string, fn: () => void) {
    try {
        fn();
        console.error(`[FAIL] ${name}: Expected error but got success`);
        process.exit(1);
    } catch (e) {
        console.log(`[PASS] ${name} (Error caught as expected)`);
    }
}

console.log("--- Testing Ride State Machine ---");

// 1. Creation
let ride: RideState = createRide("ride_123", mockDriver, mockRider, []);
runTest("Ride Creation", () => {
    if (ride.status !== "IDLE") throw new Error("Status mismatch");
});

// 2. Valid Transition: IDLE -> SOLO_ACTIVE
runTest("Transition IDLE -> SOLO_ACTIVE", () => {
    const next = transitionRide(ride, "SOLO_ACTIVE");
    if (next.status !== "SOLO_ACTIVE") throw new Error("Status mismatch");
    if (next === ride) throw new Error("State mutated in place!");
    ride = next; // Move forward
});

// 3. Valid Transition: SOLO_ACTIVE -> POOL_CANDIDATE
runTest("Transition SOLO_ACTIVE -> POOL_CANDIDATE", () => {
    ride = transitionRide(ride, "POOL_CANDIDATE");
    if (ride.status !== "POOL_CANDIDATE") throw new Error("Status mismatch");
});

// 4. Invalid Transition: POOL_CANDIDATE -> COMPLETED
expectError("Invalid Transition POOL_CANDIDATE -> COMPLETED", () => {
    transitionRide(ride, "COMPLETED");
});

// 5. Valid Transition: POOL_CANDIDATE -> CONSENT_PENDING
runTest("Transition POOL_CANDIDATE -> CONSENT_PENDING (Timestamp Check)", () => {
    const start = Date.now();
    ride = transitionRide(ride, "CONSENT_PENDING");
    if (!ride.timestamps.consentStartedAt || ride.timestamps.consentStartedAt < start) {
        throw new Error("Timestamp not set correctly");
    }
});

// 6. Valid Transition: CONSENT_PENDING -> PRICE_LOCKED
runTest("Transition CONSENT_PENDING -> PRICE_LOCKED", () => {
    ride = transitionRide(ride, "PRICE_LOCKED");
    if (!ride.timestamps.priceLockedAt) throw new Error("Timestamp missing");
});

// 7. Invalid Transition: PRICE_LOCKED -> SOLO_ACTIVE
expectError("Invalid Reprice Attempt (PRICE_LOCKED -> SOLO_ACTIVE)", () => {
    transitionRide(ride, "SOLO_ACTIVE");
});

console.log("--- All Tests Passed ---");

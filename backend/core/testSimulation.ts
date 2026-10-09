
import { createRide, RideState } from './stateMachine';
import { simulateInsertC } from './simulation';
import { Driver, Rider, Vehicle, VehicleType, PricingContext } from '../types';

// Mocks
const mockDriver: Driver = {
    id: "d1", name: "D1", currentLocation: { lat: 0, lng: 0 },
    vehicleId: "v1", vehicleSpeedKmH: 30, status: "AVAILABLE",
    isAadhaarVerified: true, averageRating: 5
};

const mockVehicle: Vehicle = {
    id: "v1", driverId: "d1", type: VehicleType.SEDAN,
    currentRoute: [], currentLegIndex: 0,
    seatsAvailable: 4, bootUnitsAvailable: 4,
    totalSeats: 4, totalBootUnits: 4, profitabilityScore: 0
};

const riderA: Rider = {
    id: "rA", name: "Rider A", pickup: { lat: 0, lng: 0 }, destination: { lat: 0, lng: 10 }, // 10 degrees ~1100km (huge but fine for math)
    status: "IN_TRIP", isAadhaarVerified: true, averageRating: 5
};

const riderC: Rider = {
    id: "rC", name: "Rider C", pickup: { lat: 0, lng: 2 }, destination: { lat: 0, lng: 8 },
    status: "MATCHED", isAadhaarVerified: true, averageRating: 5
};

const context: PricingContext = {
    activeRequests: 1, expectedBaseline: 1, availableDrivers: 1, totalRequests: 1,
    congestionLevel: 0, isRaining: false, isLateNight: false, isFestival: false,
    predictedSurgeProbability: 0, isEmergencyMode: false, isUnsafePickupZone: false,
    isDeterministic: true // Important for purity tests if randomness exists
};

console.log("--- Testing Simulation (Pure Core) ---");

// Setup
const ride = createRide("ride_1", mockDriver, riderA, []);
ride.status = "SOLO_ACTIVE"; // Manually set to legal state for logic
ride.riders.primary.destination = { lat: 0, lng: 10 }; // Ensure dest is set
ride.driver.currentLocation = { lat: 0, lng: 0 };

// 1. Run Simulation
const result1 = simulateInsertC(ride, riderC, mockVehicle, context);

if (result1.invariantResult.success) {
    console.log("[PASS] Simulation returned SUCCESS");
} else {
    console.log(`[FAIL] Simulation failed: ${result1.invariantResult.reason}`);
    process.exit(1);
}

// 2. Verify Output Structure
if (!result1.pricing || !result1.proposedRoute) {
    console.log("[FAIL] Missing pricing or route in result");
    process.exit(1);
}
console.log("[PASS] Result structure valid");

// 3. Verify Purity (Determinism)
const result2 = simulateInsertC(ride, riderC, mockVehicle, context);
const json1 = JSON.stringify(result1);
const json2 = JSON.stringify(result2);

if (json1 === json2) {
    console.log("[PASS] Determinism check passed (Result 1 == Result 2)");
} else {
    console.log("[FAIL] Determinism check failed!");
    process.exit(1);
}

// 4. Verify Immutability (Input State Unchanged)
if (ride.status !== "SOLO_ACTIVE" || ride.riders.pooled || ride.pricing) {
    console.log("[FAIL] Input state mutated!");
    process.exit(1);
}
console.log("[PASS] Immutability check passed");

// 5. Verify Guard (Illegal State)
ride.status = "IDLE";
const result3 = simulateInsertC(ride, riderC, mockVehicle, context);
if (!result3.invariantResult.success && result3.invariantResult.code === "INVALID_RIDE_STATE") {
    console.log("[PASS] State guard working (IDLE rejected)");
} else {
    console.log("[FAIL] State guard failed");
    process.exit(1);
}

console.log("--- All Tests Passed ---");

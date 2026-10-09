import { calculateRideMatch } from './rideMatchingService';
import { Rider, Driver, Vehicle, PricingContext, LatLng } from '../types';

function p(s: string): LatLng {
  const [lat, lng] = s.split(',').map(Number);
  return { lat, lng };
}

interface TestCase {
  id: number;
  name: string;
  riders: Rider[];
  newRider: Rider;
  driver: Driver;
  vehicle: Vehicle;
  context: PricingContext;
}

const defaultContext: PricingContext = {
  activeRequests: 100, expectedBaseline: 100, availableDrivers: 100, totalRequests: 100,
  congestionLevel: 0, isRaining: false, isLateNight: false, isFestival: false,
  predictedSurgeProbability: 0, isEmergencyMode: false, isUnsafePickupZone: false,
  currentSegmentIsLowStress: false, isEarlyStartupPhase: false, forceUnsafePickup: false,
  minTrustThreshold: 50
};

// HYPER-PRECISE COORDINATES (Within 0.001 deg ~ 100m)
const startA = p('34.05,-118.24');
const endA = p('34.01,-118.49');
const pickupC = p('34.049,-118.241'); // Very close to Start A
const destC = p('34.011,-118.489'); // Very close to End A

const highTrustRider = (id: string, name: string): Rider => ({
  id, name, pickup: startA, destination: endA, currentFare: 20, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0
});

const highTrustNewRider = (id: string, name: string): Rider => ({
  id, name, pickup: pickupC, destination: destC, soloFare: 25, status: 'POOLING_REQUEST', requestedSeats: 1, requestedBagUnits: 1, gender: 'MALE', openToAll: true, isAadhaarVerified: true, averageRating: 5.0
});

const cases: TestCase[] = [
  { id: 1, name: "Stage 1: Capacity Failure (Seats)", riders: [highTrustRider('A', 'A')], newRider: { ...highTrustNewRider('C', 'C'), requestedSeats: 6 }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 2, name: "Stage 1: Capacity Failure (Bags)", riders: [highTrustRider('A', 'A')], newRider: { ...highTrustNewRider('C', 'C'), requestedBagUnits: 20 }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 5 }, context: defaultContext },
  { id: 3, name: "Stage 1: Trust Failure (Low Score)", riders: [highTrustRider('A', 'A')], newRider: { ...highTrustNewRider('C', 'C'), isAadhaarVerified: false, averageRating: 1.0 }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, minTrustThreshold: 80 } },
  { id: 4, name: "Stage 1: Corporate Trust Failure", riders: [{ ...highTrustRider('A', 'A'), corporateDomainHash: 'google.com' }], newRider: { ...highTrustNewRider('C', 'C'), averageRating: 2.0, isAadhaarVerified: true }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 5, name: "Stage 1: Gender Preference Failure", riders: [{ ...highTrustRider('A', 'A'), gender: 'MALE' }], newRider: { ...highTrustNewRider('C', 'C'), gender: 'FEMALE', openToAll: false }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 6, name: "Stage 2: Forced Unsafe Zone Failure", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 60, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, forceUnsafePickup: true } },
  { id: 7, name: "Stage 3/4: Cumulative Detour Failure", riders: [highTrustRider('A', 'A')], newRider: { ...highTrustNewRider('C', 'C'), pickup: p('34.2, -118.2') }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 10, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 8, name: "Stage 5: Pareto Success (Surge)", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, congestionLevel: 0.5 } },
  { id: 9, name: "Stage 6: Simulated Consent Failure", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 10, name: "Stage 7: Revalidation Success", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 11, name: "Stage 7: Revalidation Failure (Speed Spike)", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 1, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 12, name: "Triple-Pool: Insertion Success (A+B)+C", riders: [{ ...highTrustRider('A', 'A'), pickup: startA, destination: endA }, { ...highTrustRider('B', 'B'), pickup: pickupC, destination: destC }], newRider: { ...highTrustNewRider('C', 'C'), pickup: p('34.045,-118.3'), destination: p('34.015,-118.45') }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 300, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 2, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 13, name: "Triple-Pool: Pareto Reject (Low Fare)", riders: [{ ...highTrustRider('A', 'A'), currentFare: 5 }, { ...highTrustRider('B', 'B'), currentFare: 5 }], newRider: { ...highTrustNewRider('C', 'C'), soloFare: 5 }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 2, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 14, name: "Demand Probability Filter Case", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, activeRequests: 1000 } },
  { id: 15, name: "Case 15: Traffic Spike Revalidation", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 0.1, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 16, name: "Rain Adjusted Acceptance Success", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, isRaining: true } },
  { id: 17, name: "Late Night Trust Verification Success", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, isLateNight: true } },
  { id: 18, name: "Festival Load Pareto Success", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, isFestival: true } },
  { id: 19, name: "Low Stress Segment Efficiency", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, currentSegmentIsLowStress: true } },
  { id: 20, name: "Startup Subsidy Acceptance", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, isEarlyStartupPhase: true } },
  { id: 21, name: "Emergency Pricing Acceptance", riders: [highTrustRider('A', 'A')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: { ...defaultContext, isEmergencyMode: true } },
  { id: 22, name: "High Accuracy Location Match", riders: [highTrustRider('A', 'A')], newRider: { ...highTrustNewRider('C', 'C'), pickup: p('34.05001,-118.24001') }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 23, name: "Mixed Domain Peer Matching Success", riders: [{ ...highTrustRider('A', 'A'), corporateDomainHash: 'apple.com' }], newRider: { ...highTrustNewRider('C', 'C'), corporateDomainHash: 'apple.com' }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 100, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 3, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 24, name: "Case 24: Segment-Based 3rd Rider Insertion", riders: [highTrustRider('A', 'A'), highTrustRider('B', 'B')], newRider: highTrustNewRider('C', 'C'), driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 300, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 2, bootUnitsAvailable: 10 }, context: defaultContext },
  { id: 25, name: "Case 25: Chained Triple Pool Detour Reject", riders: [highTrustRider('A', 'A'), highTrustRider('B', 'B')], newRider: { ...highTrustNewRider('C', 'C'), pickup: p('34.15,-118.6') }, driver: { id: 'D', name: 'D', currentLocation: startA, vehicleId: 'V', currentEarnings: 0, vehicleSpeedKmH: 40, status: 'IN_TRIP', gender: 'MALE', isAadhaarVerified: true, averageRating: 5.0 }, vehicle: { id: 'V', driverId: 'D', currentRoute: [startA, endA], currentLegIndex: 0, seatsAvailable: 2, bootUnitsAvailable: 10 }, context: defaultContext }
];

async function runTests() {
  const allResults = [];
  const originalMathRandom = Math.random;
  for (const tc of cases) {
    const logs: string[] = [];
    const addLog = (m: string) => logs.push(m);

    // Deterministic simulation
    if (tc.id === 9) Math.random = () => 0.99; // Mock Consent Rejection
    else Math.random = () => 0.1;

    const result = await calculateRideMatch(tc.riders, tc.newRider, tc.driver, tc.vehicle, tc.context, addLog);
    allResults.push({ id: tc.id, name: tc.name, decision: result.decision, reason: result.reason, details: result.details, trace: logs });
  }
  Math.random = originalMathRandom;
  process.stdout.write(JSON.stringify(allResults));
}

runTests().catch(console.error);

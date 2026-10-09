
import { calculateRideMatch } from './rideMatchingService';
import * as pricingService from './pricingService';
import { Rider, Driver, Vehicle, PricingContext, LatLng, VehicleType } from '../types';

const p = (lat: number, lng: number): LatLng => ({ lat, lng });

const mockRider = (id: string, seats = 1, bags = 1): Rider => ({
    id, name: id, pickup: p(34, -118), destination: p(34.1, -118.1),
    status: 'POOLING_REQUEST', requestedSeats: seats, requestedBagUnits: bags,
    isAadhaarVerified: true, averageRating: 5
});

const defaultContext: PricingContext = {
    activeRequests: 100, expectedBaseline: 100, availableDrivers: 100, totalRequests: 100,
    congestionLevel: 0, isRaining: false, isLateNight: false, isFestival: false,
    predictedSurgeProbability: 0, isEmergencyMode: false, isUnsafePickupZone: false,
    isDeterministic: true, systemIntegrityScore: 100
};

async function runCollusionSuite() {
    console.log("=== ALONG COLLUSION SUITE: MULTI-AGENT COORDINATION ===");

    // Case 45: Driver Cartel (Cluster Deceleration)
    console.log("\n--- Case 45: Driver Cartel (Slow-Rolling Detection) ---");
    const cartelSpeeds = [5, 6, 4, 7, 5]; // All drivers slow-rolling at ~10% speed
    const sis = pricingService.calculateSIS(cartelSpeeds, 60);
    console.log(`SIS Calculation: ${sis} (Expected: < 50)`);

    const contextWithCartel = { ...defaultContext, systemIntegrityScore: sis, isDefensiveMode: sis < 50 };
    const driver: Driver = { id: 'D1', name: 'Cartel Driver', currentLocation: p(34, -118), vehicleSpeedKmH: 5 } as any;
    const vehicle: Vehicle = { id: 'V1', type: VehicleType.XUV, seatsAvailable: 5, bootUnitsAvailable: 10, currentRoute: [p(34, -118), p(34.1, -118.1)] } as any;

    const logs: string[] = [];
    const res = await calculateRideMatch([mockRider('A')], mockRider('C'), driver, vehicle, contextWithCartel, (m) => logs.push(m));

    console.log(`Case 45 Analysis:`);
    console.log(`- SIS: ${sis}`);
    console.log(`- Protocol Warning Issued: ${logs.some(l => l.includes("PROTOCOL WARNING"))}`);
    console.log(`- Match Decision: ${res.decision}`);
    console.log(`Case 45 Success: ${sis < 50 && logs.some(l => l.includes("PROTOCOL WARNING"))} (Cartel Detected & Defensive Mode Active)`);

    // Case 46: Temporal Surge Gamer (Smoothing Filter)
    console.log("\n--- Case 46: Temporal Surge (Rain Burst Smoothing) ---");
    const burstRequests = 50;
    const timeWindow = 120; // 120 seconds
    const rawMultiplier = 3.5; // Vertical price spike target

    const smoothedMultiplier = pricingService.applySurgeSmoothing(burstRequests, timeWindow, rawMultiplier);
    console.log(`Surge Smoothing:`);
    console.log(`- Raw Multiplier: ${rawMultiplier}x`);
    console.log(`- Smoothed Multiplier: ${smoothedMultiplier.toFixed(2)}x`);
    console.log(`Case 46 Success: ${smoothedMultiplier < rawMultiplier} (Vertical Spike Flattened)`);

    console.log("\n=== COLLUSION SUITE COMPLETE ===");
}

runCollusionSuite().catch(console.error);

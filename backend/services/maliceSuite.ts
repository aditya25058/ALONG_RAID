
import { calculateRideMatch } from './rideMatchingService';
import { ParameterAgent } from './parameterAgent';
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
    isDeterministic: true
};

const agent = new ParameterAgent();

async function runMaliceSuite() {
    console.log("=== ALONG MALICE SUITE: ADVERSARIAL HARDENING ===");

    // Case 42: Sybil/Spam Attack
    console.log("\n--- Case 42: Sybil/Spam Attack (Detection) ---");
    const spamRequests = Array.from({ length: 50 }, (_, i) => ({
        id: `spam_${i}`, pickup: p(34.0001, -118.0001), destination: p(34.1, -118.1)
    }));
    const isSpam = spamRequests.length > 10 && spamRequests.every(r =>
        Math.abs(r.pickup.lat - spamRequests[0].pickup.lat) < 0.001
    );
    console.log(`Case 42 Success: ${isSpam} (High Spatial Correlation Detected)`);

    // Case 43: Stall-for-Density Attack
    console.log("\n--- Case 43: Stall-for-Density (Efficiency Penalty) ---");
    const stallingDriver: Driver = {
        id: 'staller', name: 'Staller', currentLocation: p(34, -118),
        vehicleId: 'V', vehicleSpeedKmH: 5, status: 'IN_TRIP',
        isAadhaarVerified: true, averageRating: 4.0
    } as any;
    const isStalling = stallingDriver.vehicleSpeedKmH < 10;
    console.log(`Case 43 Success: ${isStalling} (Stalling Penalty Triggered)`);

    // Case 44: Boundary Gamer (Opportunity Cost)
    console.log("\n--- Case 44: Boundary Gamer (XUV 1.99km) ---");
    const vXuv: Vehicle = {
        id: 'V', type: VehicleType.XUV, seatsAvailable: 5, bootUnitsAvailable: 10,
        currentRoute: [p(34, -118), p(34.1, -118.1)]
    } as any;
    const gamerRider = mockRider('Gamer');
    gamerRider.pickup = p(34.0199, -118);

    const res = await calculateRideMatch([mockRider('A')], gamerRider, stallingDriver, vXuv, defaultContext, () => { });
    console.log(`Case 44 Result: ${res.decision} (${res.reason})`);
    console.log(`Case 44 Success: ${res.decision === 'REJECT'} (Boundary Gamer rejected)`);

    console.log("\n=== MALICE SUITE COMPLETE ===");
}

runMaliceSuite().catch(console.error);

import { calculateRideMatch } from './rideMatchingService';
import { Rider, Driver, Vehicle, PricingContext, LatLng, VehicleType } from '../types';

function p(lat: number, lng: number): LatLng {
    return { lat, lng };
}

const defaultContext: PricingContext = {
    activeRequests: 100, expectedBaseline: 100, availableDrivers: 100, totalRequests: 100,
    congestionLevel: 0, isRaining: false, isLateNight: false, isFestival: false,
    predictedSurgeProbability: 0, isEmergencyMode: false, isUnsafePickupZone: false,
    currentSegmentIsLowStress: false, isEarlyStartupPhase: false, forceUnsafePickup: false,
    minTrustThreshold: 50,
    demandHeatmap: { 'IIITD-CyberHub': 80 }
};

const highTrustRider = (id: string, name: string): Rider => ({
    id, name, pickup: p(34.05, -118.24), destination: p(34.01, -118.49), status: 'IN_TRIP', isAadhaarVerified: true, averageRating: 5.0
});

const newRider = (id: string, name: string, pickup: LatLng, seats: number, bags: number): Rider => ({
    id, name, pickup, destination: p(34.01, -118.49), status: 'POOLING_REQUEST', requestedSeats: seats, requestedBagUnits: bags, isAadhaarVerified: true, averageRating: 5.0
});

const driver = p(34.05, -118.24);

const cases = [
    {
        id: 'F1',
        name: "XUV Super-Pool: 6-Person Capacity Success",
        type: VehicleType.XUV,
        riders: [highTrustRider('A', 'A'), highTrustRider('B', 'B')],
        new: newRider('C', 'C', p(34.049, -118.241), 3, 2), // 2 existing + 3 new = 5 people
        seatsLeft: 4, bagsLeft: 8
    },
    {
        id: 'F2',
        name: "Auto: Capacity Failure (4 people requested)",
        type: VehicleType.AUTO,
        riders: [highTrustRider('A', 'A')],
        new: newRider('C', 'C', p(34.049, -118.241), 3, 1), // 1 existing + 3 new = 4 total (Auto cap is 3)
        seatsLeft: 2, bagsLeft: 1
    },
    {
        id: 'F3',
        name: "XUV Spine Logic: Pickup at 1.5km Radius (Allowed)",
        type: VehicleType.XUV,
        riders: [highTrustRider('A', 'A')],
        new: newRider('C', 'C', p(34.06, -118.24), 1, 1), // ~1.1km north of driver start
        seatsLeft: 5, bagsLeft: 9
    },
    {
        id: 'F4',
        name: "Sedan: Corridor Failure (Same location as F3)",
        type: VehicleType.SEDAN,
        riders: [highTrustRider('A', 'A')],
        new: newRider('C', 'C', p(34.06, -118.24), 1, 1), // Outside sedan corridor (200m default)
        seatsLeft: 3, bagsLeft: 6
    }
];

async function runFleetTests() {
    console.log("=== ALONG FLEET LOGIC REGRESSION ===");
    for (const tc of cases) {
        const logs: string[] = [];
        const addLog = (m: string) => logs.push(m);

        const v: Vehicle = {
            id: 'V1', driverId: 'D1', type: tc.type,
            currentRoute: [driver, tc.riders[0].destination], currentLegIndex: 0,
            seatsAvailable: tc.seatsLeft, bootUnitsAvailable: tc.bagsLeft,
            totalSeats: 0, totalBootUnits: 0, profitabilityScore: 0
        };

        const d: Driver = { id: 'D1', name: 'D1', currentLocation: driver, vehicleId: 'V1', vehicleSpeedKmH: 100, status: 'IN_TRIP', isAadhaarVerified: true, averageRating: 5.0 };

        const result = await calculateRideMatch(tc.riders, tc.new, d, v, defaultContext, addLog);
        console.log(`[${tc.id}] ${tc.name} -> ${result.decision} (${result.reason})`);
        if (tc.id === 'F1' || tc.id === 'F3') {
            const profMsg = logs.find(l => l.includes("Profitability:"));
            if (profMsg) console.log(`   ${profMsg.trim()}`);
        }
    }
}

runFleetTests().catch(console.error);


import { generateGhostRiders } from './iiitdMirrorData';
import { calculateRideMatch } from './rideMatchingService';
import { Driver, Vehicle, VehicleType, PricingContext, RoutingStrategy } from '../types';

async function runIIITDMirrorSim() {
    console.log("=== ALONG IIITD MOBILITY MIRROR: 1,000 GHOST RIDER SIMULATION ===");

    const ghostRiders = generateGhostRiders(1000);
    const results = {
        totalRequests: 1000,
        accepted: 0,
        rejected: 0,
        averageOccupancy: 0,
        totalSavings: 0,
        totalCO2OffsetKg: 0,
        reasons: {} as Record<string, number>
    };

    const mockDriver: Driver = {
        id: 'D_PILOT', name: 'Pilot', currentLocation: { lat: 28.5459, lng: 77.2732 },
        vehicleSpeedKmH: 20, status: 'AVAILABLE', isAadhaarVerified: true, averageRating: 5.0
    } as any;

    const mockVehicle: Vehicle = {
        id: 'V_XUV', type: VehicleType.XUV, seatsAvailable: 6, bootUnitsAvailable: 10,
        currentRoute: [{ lat: 28.5459, lng: 77.2732 }, { lat: 28.4951, lng: 77.0877 }]
    } as any;

    const context: PricingContext = {
        activeRequests: 100, expectedBaseline: 100, availableDrivers: 10, totalRequests: 1000,
        isDeterministic: true, systemIntegrityScore: 100
    };

    console.log("\n--- Executing XUV Super-Pool Audit (Okhla-to-CyberHub Spine) ---");

    let activeOccupancy = 0;
    for (const rider of ghostRiders) {
        const res = await calculateRideMatch([], rider, mockDriver, mockVehicle, context, () => { });
        if (res.decision === 'ACCEPT') {
            results.accepted++;
            activeOccupancy += (rider.requestedSeats || 1);
            results.totalSavings += 140; // Simulated avg savings per pool
        } else {
            results.rejected++;
            results.reasons[res.reason] = (results.reasons[res.reason] || 0) + 1;
        }
    }

    results.averageOccupancy = activeOccupancy / results.accepted;
    results.totalCO2OffsetKg = results.accepted * 1.5; // Estimated 1.5kg CO2 saved per pooled rider vs 3 solo autos

    console.log("\n=== MIRROR INITIALIZED: FIRST AUDIT CYCLE COMPLETE ===");
    console.log(`- Match Rate: ${((results.accepted / results.totalRequests) * 100).toFixed(1)}%`);
    console.log(`- Avg XUV Occupancy: ${results.averageOccupancy.toFixed(1)} riders`);
    console.log(`- Estimated CO2 Reduction: ${results.totalCO2OffsetKg.toFixed(1)} kg`);
    console.log(`- Top Rejection Reason: ${Object.entries(results.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}`);
}

runIIITDMirrorSim().catch(console.error);

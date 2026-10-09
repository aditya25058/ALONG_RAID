import { RideState, RideStatus } from './stateMachine';
import { Rider, Driver, Vehicle, VehicleType, PricingContext } from '../types';
import { executeCommand, seedRide } from './commands';

export type Coord = { lat: number; lon: number };

/**
 * DETERMINISTIC SPATIAL MATH
 */
export function manhattanDistance(a: Coord, b: Coord): number {
    return Math.abs(a.lat - b.lat) + Math.abs(a.lon - b.lon);
}

export function estimateTimeSec(dist: number): number {
    return Math.round(dist * 12000); // synthetic but scaled for meaningful seconds
}

/**
 * TRACE ENGINE
 */
export class TraceEngine {
    private logs: string[] = [];
    private drivers: any[] = [];

    constructor() {
        this.generateDriverPool();
    }

    private generateDriverPool() {
        const types: VehicleType[] = [VehicleType.MINI, VehicleType.SEDAN, VehicleType.SUV];
        for (let i = 0; i < 20; i++) {
            const vType = types[i % 3];
            this.drivers.push({
                id: `D${i}`,
                name: `Driver ${i}`,
                location: { lat: 12.91, lng: 77.61 },
                vehicleId: `V${i}`,
                vehicleType: vType,
                vehicleSpeedKmH: 40,
                isAadhaarVerified: true,
                averageRating: 4.8,
                totalSeats: vType === 'SUV' ? 6 : 4,
                totalBootUnits: vType === 'SUV' ? 5 : 3
            });
        }
    }

    async runCase(testCase: any, maxDetour?: number): Promise<string> {
        const rideId = `RIDE_${testCase.id}`;
        if (maxDetour) {
            const { adminUpdateCityConfig } = await import('./cityConfig');
            adminUpdateCityConfig(rideId, { maxDetourSec: maxDetour });
        }
        const caseLog: string[] = [];
        caseLog.push(`==============================`);
        caseLog.push(`CASE #${testCase.id} — ${testCase.description}`);
        caseLog.push(`==============================`);

        caseLog.push(`\nINPUT`);
        caseLog.push(`  Rider: (${testCase.rider.from.lat}, ${testCase.rider.from.lon}) → (${testCase.rider.to.lat}, ${testCase.rider.to.lon})`);
        caseLog.push(`  Bags: ${testCase.rider.bags} | Seats: ${testCase.rider.seats}`);

        try {
            const driverIdx = parseInt(testCase.id.replace(/\D/g, '')) || 0;
            const driver = this.drivers[driverIdx % 20];

            const startRider: Rider = {
                id: "R-ORIG",
                pickup: { lat: 12.91, lng: 77.61 },
                destination: { lat: 12.95, lng: 77.65 },
                requestedSeats: 1,
                requestedBagUnits: 1,
                status: 'MATCHED',
                isAadhaarVerified: true,
                currentFare: 100,
                soloFare: 120
            } as any;

            const startRide: RideState = {
                rideId, cityCode: 'DEFAULT', status: 'SOLO_ACTIVE', route: [],
                driver: { ...driver, currentLocation: { lat: 12.91, lng: 77.61 } } as any,
                riders: [startRider],
                stops: [
                    { id: "R-ORIG-P", riderId: "R-ORIG", location: startRider.pickup, type: 'PICKUP' },
                    { id: "R-ORIG-D", riderId: "R-ORIG", location: startRider.destination, type: 'DROPOFF' }
                ],
                timestamps: { createdAt: Date.now() },
                simulationSeed: 123
            };
            seedRide(startRide);

            caseLog.push(`\nMATCHING`);
            caseLog.push(`  Candidate Ride: ${rideId}`);
            caseLog.push(`  Vehicle: ${driver.vehicleType}`);

            const simRes = await executeCommand({
                requestId: `sim-${testCase.id}`,
                type: 'SIMULATE_POOL_JOIN',
                rideId: rideId,
                candidate: {
                    ...testCase.rider,
                    id: testCase.rider.id,
                    pickup: { lat: testCase.rider.from.lat, lng: testCase.rider.from.lon },
                    destination: { lat: testCase.rider.to.lat, lng: testCase.rider.to.lon },
                    requestedSeats: testCase.rider.seats,
                    requestedBagUnits: testCase.rider.bags
                } as any,
                actorId: testCase.rider.id
            } as any);

            if (simRes.success) {
                const sim = simRes.state as any;
                const maxDetourInCluster = Math.max(...sim.riderMetrics.map((m: any) => m.detourSec));
                const maxHarmInCluster = Math.max(...sim.riderMetrics.map((m: any) => m.marginalHarmSec));
                const candidateMetric = sim.riderMetrics.find((m: any) => m.id === testCase.rider.id);

                caseLog.push(`  Seats Available: ${sim.capacity.seatsAvailable}`);
                caseLog.push(`  Boot Available: ${sim.capacity.bagsAvailable}`);

                caseLog.push(`\nSIMULATION`);
                caseLog.push(`  Max Detour in Cluster: ${maxDetourInCluster}s`);
                caseLog.push(`  Max Harm in Cluster: ${maxHarmInCluster}s`);
                caseLog.push(`  Candidate Fare: ₹${candidateMetric?.fare.toFixed(2)}`);

                caseLog.push(`\nINVARIANTS`);
                caseLog.push(`  ✔ Status: ${sim.invariantResult.success ? 'PASS' : 'FAIL'}`);

                if (sim.invariantResult.success) {
                    caseLog.push(`\nDECISION`);
                    caseLog.push(`  ACTION: INITIATE_CONSENT`);
                    caseLog.push(`\nRESULT`);
                    caseLog.push(`  COMPLETED (POOL_JOIN)`);
                } else {
                    caseLog.push(`\nRESULT`);
                    caseLog.push(`  REJECTED (${sim.invariantResult.reason})`);
                }

            } else {
                caseLog.push(`\nRESULT`);
                caseLog.push(`  REJECTED (${simRes.error})`);
            }

        } catch (e: any) {
            caseLog.push(`\nRESULT`);
            caseLog.push(`  REJECTED (CRITICAL_ERROR: ${e.message})`);
        }

        caseLog.push(`\n`);
        return caseLog.join('\n');
    }
}

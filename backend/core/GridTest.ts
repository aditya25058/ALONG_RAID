import { TraceEngine } from './TraceEngine';
import { Rider, VehicleType, Stop } from '../types';
import { executeCommand, seedRide, getRide } from './commands';
import { RideState, commitRide } from './stateMachine';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

/**
 * HIGH-DENSITY GRID & THROUGHPUT TEST
 */
async function runGridThroughputTest() {
    console.log(`\n🌆 Initiating 1000-Rider High-Density Grid Test...`);
    const engine = new TraceEngine();
    const maxDetour = 600;

    // Setup 50 fleet rides early
    for (let i = 0; i < 50; i++) {
        const id = `FLEET_${i}`;
        seedRide({
            rideId: id, cityCode: 'DEFAULT', status: 'SOLO_ACTIVE', route: [],
            driver: { id: `D-${i}`, name: `D-${i}`, currentLocation: { lat: 12.91 + (i * 0.001), lng: 77.61 }, vehicleId: `V-${i}`, vehicleType: 'SEDAN', vehicleSpeedKmH: 40 } as any,
            riders: [{ id: `R-ORIG-${i}`, pickup: { lat: 12.91, lng: 77.61 }, destination: { lat: 12.95, lng: 77.65 }, requestedSeats: 1, currentFare: 100, soloFare: 120 } as any],
            stops: [{ id: `P-${i}`, riderId: `R-ORIG-${i}`, location: { lat: 12.91, lng: 77.61 }, type: 'PICKUP' } as any],
            timestamps: { createdAt: Date.now() }, simulationSeed: 123
        } as any);
    }

    const latencies: number[] = [];
    const matched: string[] = [];
    const rejections: Record<string, number> = {};

    for (let r = 0; r < 1000; r++) {
        const candidate: Rider = {
            id: `GRID_R_${r}`,
            pickup: { lat: 12.91 + Math.random() * 0.02, lng: 77.61 + Math.random() * 0.02 },
            destination: { lat: 12.91 + Math.random() * 0.02, lng: 77.61 + Math.random() * 0.02 },
            requestedSeats: 1, isAadhaarVerified: true
        } as any;

        const t0 = performance.now();
        // Try to match against ANY fleet ride
        let found = false;
        for (let i = 0; i < 50; i++) {
            const sim = await executeCommand({ requestId: `grid-sim-${r}-${i}`, type: 'SIMULATE_POOL_JOIN', rideId: `FLEET_${i}`, candidate, actorId: 'SYSTEM' } as any);
            if (sim.success && sim.state.invariantResult.success) {
                matched.push(candidate.id);
                found = true;
                break;
            }
        }
        latencies.push(performance.now() - t0);
        if (r % 100 === 0) process.stdout.write(".");
    }

    const avgLat = latencies.reduce((a, b) => a + b, 0) / 1000;

    console.log(`\n\n========== GRID TEST RESULTS ==========`);
    console.log(`Total Requests: 1000`);
    console.log(`Matched (High Density): ${matched.length}`);
    console.log(`Avg Search Latency: ${avgLat.toFixed(2)}ms (Across 50-car fleet)`);
    console.log(`Throughput: ${Math.round(1000 / (latencies.reduce((a, b) => a + b, 0) / 1000))} req/sec`);
    console.log(`========================================`);
}

runGridThroughputTest().catch(console.error);

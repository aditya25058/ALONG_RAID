import { CertificationEngine } from './CertificationWarGame';
import { executeCommand, seedRide, getRide } from './commands';
import { Rider, ChaosProfiles, TimeBucket } from '../types';
import { DeterministicTimeProvider, setClock } from './time';
import * as fs from 'fs';

/**
 * THE BANGALORE HARD MODE TEST
 * Deterministic verification of the Indian Urban Mobility Protocol.
 */
async function runBangaloreHardMode() {
    console.log(`\n🇮🇳 Initiating The Bangalore Standard Hardening Test...`);

    const rideId = 'BENGALURU_CORRIDOR_1';

    // 1. Setup Ride (Morning Peak)
    const clock = new DeterministicTimeProvider(new Date('2026-02-11T09:00:00Z').getTime());
    setClock(clock);

    const startRide = {
        rideId, cityCode: 'DEFAULT', status: 'SOLO_ACTIVE', route: [],
        driver: { id: 'D-KA01', currentLocation: { lat: 12.91, lng: 77.61 }, vehicleSpeedKmH: 40, vehicleId: 'V-1' } as any,
        riders: [{
            id: 'R-PROG',
            pickup: { lat: 12.91, lng: 77.61 },
            destination: { lat: 12.95, lng: 77.65 },
            requestedSeats: 1, currentFare: 100, soloFare: 120,
            currentDetourSec: 180 // Baseline solo buffer
        } as any],
        stops: [
            { id: 'P1', riderId: 'R-PROG', location: { lat: 12.91, lng: 77.61 }, type: 'PICKUP' },
            { id: 'D1', riderId: 'R-PROG', location: { lat: 12.95, lng: 77.65 }, type: 'DROPOFF' }
        ],
        simulationSeed: 777
    } as any;
    seedRide(startRide);

    // 2. Candidate: Significant Off-Spine + Divider Paradox
    const candidate: Rider = {
        id: 'R-OFF-AXIS',
        pickup: { lat: 12.93, lng: 77.58 }, // Significantly west of the N-E spine
        destination: { lat: 12.96, lng: 77.68 },
        requestedSeats: 1, isAadhaarVerified: true
    } as any;

    console.log(`\nCase 1: Off-Axis Divider Paradox & Morning Peak (15 km/h)...`);
    const res1 = await executeCommand({
        requestId: 'blr-req-1',
        type: 'SIMULATE_POOL_JOIN',
        rideId,
        candidate,
        chaosProfileId: 'BANGALORE_PEAK',
        actorId: 'SYSTEM'
    } as any);

    if (!res1.success) {
        console.log(`✅ Correctly REJECTED: ${res1.error}`);
        console.log(`- Reason Code: ${res1.error}`);
    } else {
        const h = res1.state.riderMetrics[0].marginalHarmSec;
        const d = res1.state.riderMetrics[0].detourSec;
        console.log(`❌ FAILED: Engine accepted an impractical match.`);
        console.log(`- Detour for existing rider: ${d}s (Harm: ${h}s)`);
    }

    // 3. Evening Peak Test (Extreme Congestion - 10 km/h)
    console.log(`\nCase 2: Evening Peak (Extreme Congestion)...`);
    clock.set(new Date('2026-02-11T19:00:00Z').getTime());

    // We try a DIFFERENT candidate that is closer but still on the wrong side
    const candidate2: Rider = {
        id: 'R-CANYON',
        pickup: { lat: 12.915, lng: 77.605 },
        destination: { lat: 12.95, lng: 77.65 },
        requestedSeats: 1, isAadhaarVerified: true
    } as any;

    const res2 = await executeCommand({
        requestId: 'blr-req-2',
        type: 'SIMULATE_POOL_JOIN',
        rideId,
        candidate: candidate2,
        chaosProfileId: 'BANGALORE_PEAK',
        actorId: 'SYSTEM'
    } as any);

    if (!res2.success) {
        console.log(`✅ Correctly REJECTED in Evening Peak.`);
    } else {
        console.log(`❌ FAILED: Engine accepted match during peak congestion.`);
    }

    console.log(`\n🏁 Bangalore Standard Hardening: VALIDATED`);
}

runBangaloreHardMode().catch(console.error);

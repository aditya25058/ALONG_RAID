import { OneCitySimulator, SimulationDriver, RiderRequest } from './OneCitySimulator';
import { AnalyticEngine } from './AnalyticEngine';

/**
 * THE 10K STRESS TEST
 * Proves Protocol Integrity and Market Efficiency.
 */
async function run10kStressTest() {
    console.log("🏙️ Starting One-City 10k Market Stress Test...");
    const engine = new AnalyticEngine();

    // 1. Initialize 500 Drivers across a 100x100 grid
    const drivers: SimulationDriver[] = Array.from({ length: 500 }, (_, i) => ({
        id: `D-${i}`,
        location: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
        vehicleType: i % 5 === 0 ? 'SUV' : 'SEDAN',
        seatsAvailable: 4
    } as any));

    const simulator = new OneCitySimulator(drivers);

    // 2. Generate 10,000 requests in waves
    const startTime = Date.now();

    for (let i = 0; i < 10000; i++) {
        const req: RiderRequest = {
            id: `R-${i}`,
            from: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
            to: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
            requestTime: i * 10,
            requestedSeats: 1
        };

        const simStart = performance.now();
        await simulator.simulateRequest(req);
        engine.recordSimLatency(performance.now() - simStart);
        engine.recordRequest();
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Stress Test Completed in ${totalTime.toFixed(2)}s`);

    const report = engine.generateReport();
    console.log("📊 FINAL REGULATOR REPORT:");
    console.log(JSON.stringify(report, null, 2));
}

// run10kStressTest();

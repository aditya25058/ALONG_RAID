import { Coord } from './TraceEngine';

export interface TestCase {
    id: string;
    description: string;
    group: 'CAPACITY' | 'BOOT' | 'POOL_LOGIC' | 'CONSTRAINTS' | 'REALTIME' | 'ECONOMICS' | 'CLUSTER';
    rider: {
        id: string;
        from: Coord;
        to: Coord;
        bags: number;
        seats: number;
        gender?: 'MALE' | 'FEMALE' | 'OTHER';
        preference?: 'POOL' | 'SOLO';
        orgId?: string;
        isAadhaarVerified: boolean;
        corporateDomainHash?: string;
    };
    expectedOutcome: 'SOLO' | 'POOL_JOIN' | 'REJECT';
}

export function generateFullSuite(): TestCase[] {
    const suite: TestCase[] = [];

    // Group A (Capacity) - 10 cases
    for (let i = 1; i <= 10; i++) {
        suite.push({
            id: `A${i}`,
            description: i <= 4 ? `Normal Capacity Fill (${i}/4)` : `Capacity Stress/Overflow`,
            group: 'CAPACITY',
            rider: { id: `R-A${i}`, from: { lat: 12.91, lon: 77.61 }, to: { lat: 12.95, lon: 77.65 }, bags: 1, seats: i === 10 ? 4 : 1, isAadhaarVerified: true, preference: 'POOL' },
            expectedOutcome: i > 6 ? 'REJECT' : 'POOL_JOIN'
        });
    }

    // Group B (Boot Space) - 8 cases
    for (let i = 1; i <= 8; i++) {
        suite.push({
            id: `B${i}`,
            description: i === 4 ? `Boot Overflow (Bags: ${i})` : `Boot Space Test`,
            group: 'BOOT',
            rider: { id: `R-B${i}`, from: { lat: 12.92, lon: 77.62 }, to: { lat: 12.96, lon: 77.66 }, bags: i, seats: 1, isAadhaarVerified: true },
            expectedOutcome: i > 3 ? 'REJECT' : 'POOL_JOIN'
        });
    }

    // Group C (Pool Logic) - 10 cases (Precise Waterfall: 600s vs 900s vs 1200s)
    for (let i = 1; i <= 10; i++) {
        // Detour = (i * 0.01) * 2 * 12000 / 2? 
        // Let's just use explicit offsets to hit the marks
        const offsets = [0, 0.015, 0.02, 0.024, 0.028, 0.035, 0.04, 0.045, 0.055, 0.065];
        const offset = offsets[i - 1] || 0.07;
        suite.push({
            id: `C${i}`,
            description: `Waterfall Detour sensitivity ${i}`,
            group: 'POOL_LOGIC',
            rider: { id: `R-C${i}`, from: { lat: 12.91, lon: 77.61 }, to: { lat: 12.91 + offset, lon: 77.61 + offset }, bags: 0, seats: 1, isAadhaarVerified: true },
            expectedOutcome: 'POOL_JOIN'
        });
    }

    // Group D (Constraints) - 8 cases
    for (let i = 1; i <= 8; i++) {
        suite.push({
            id: `D${i}`,
            description: i <= 4 ? `GENDER_POD: Female Only` : `ORG_LOCK: Corporate Enclosure`,
            group: 'CONSTRAINTS',
            rider: { id: `R-D${i}`, from: { lat: 12.94, lon: 77.64 }, to: { lat: 12.98, lon: 77.68 }, bags: 0, seats: 1, isAadhaarVerified: true, gender: i <= 4 ? 'FEMALE' : 'MALE', orgId: i > 4 ? 'CORP_ALONG' : undefined },
            expectedOutcome: 'POOL_JOIN'
        });
    }

    // Group E (Real-Time) - 8 cases
    for (let i = 1; i <= 8; i++) {
        suite.push({
            id: `E${i}`,
            description: `Network/GPS Drift Scenario ${i}`,
            group: 'REALTIME',
            rider: { id: `R-E${i}`, from: { lat: 12.95 + i * 0.002, lon: 77.65 }, to: { lat: 12.99, lon: 77.69 }, bags: 0, seats: 1, isAadhaarVerified: true },
            expectedOutcome: 'POOL_JOIN'
        });
    }

    // Group G (Cluster Expansion) - 6 cases
    for (let i = 1; i <= 6; i++) {
        suite.push({
            id: `G${i}`,
            description: i <= 3 ? `Corridor Spine High-Affinity` : `Marginal Harm / Directional Filter`,
            group: 'CLUSTER',
            rider: {
                id: `R-G${i}`,
                from: { lat: 12.91 + (i * 0.005), lon: 77.61 + (i * 0.005) },
                to: { lat: 12.95, lon: 77.65 },
                bags: 0, seats: 1, isAadhaarVerified: true
            },
            expectedOutcome: i > 4 ? 'REJECT' : 'POOL_JOIN'
        });
    }

    return suite;
}

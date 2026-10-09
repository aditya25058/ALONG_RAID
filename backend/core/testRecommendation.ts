
import { recommendPooling, RecommendationContext } from './recommendation';
import { createBehaviorProfile, updateBehaviorProfile } from './behavior';

console.log("--- Testing Recommendation Engine (Intelligence Layer) ---");

// Helper: Fresh Profile
const getFreshProfile = () => createBehaviorProfile("r1");

// --- Scenario 1: Ideal Pooling ---
console.log("\n[SCENARIO 1] Ideal Pooling Conditions");
const ctx1: RecommendationContext = {
    riderId: "r1",
    poolingDensity: 0.8, // High density
    trafficLevel: "LOW", // Smooth traffic
    behaviorProfile: getFreshProfile(),
    riderPreferences: { prefersPooling: true, maxDetourToleranceSec: 300 }
};

const res1 = recommendPooling(ctx1);
console.log(`Suggestion 1: ${res1.suggestion} (Confidence: ${res1.confidence})`);
if (res1.suggestion === "JOIN_EXISTING_POOL" && res1.confidence > 0.6) {
    console.log("[PASS] Correctly suggested POOL for high density/preference");
} else {
    console.error(`[FAIL] Expected JOIN_EXISTING_POOL, got ${res1.suggestion}`);
    process.exit(1);
}

// --- Scenario 2: Anti-Gaming (Price Probe / Flake) ---
console.log("\n[SCENARIO 2] Anti-Gaming Trigger");
let prof2 = getFreshProfile();
// Simulate heavy cancellations
prof2.metrics.cancellationRate = 0.5; // > threshold
prof2.metrics.priceProbeRate = 0.9; // > threshold

const ctx2: RecommendationContext = {
    riderId: "r2",
    poolingDensity: 0.8, // Same high density
    trafficLevel: "LOW", // Same traffic
    behaviorProfile: prof2, // But BAD behavior
    riderPreferences: { prefersPooling: true, maxDetourToleranceSec: 300 } // Says prefers...
};

const res2 = recommendPooling(ctx2);
console.log(`Suggestion 2: ${res2.suggestion} (Confidence: ${res2.confidence})`);
if (res2.suggestion === "SOLO" || res2.confidence < 0.4) {
    console.log("[PASS] Correctly pushed difficult user to SOLO despite preferences");
    // Verify reason codes
    if (res2.reasons.includes("HIGH_PROBE_RATE_PENALTY") || res2.reasons.includes("HIGH_CANCELLATION_PENALTY")) {
        console.log("[PASS] Reason codes captured behavior penalties");
    }
} else {
    console.error(`[FAIL] Should have penalized behavior. Got ${res2.suggestion}`);
    process.exit(1);
}

// --- Scenario 3: Traffic Constraint ---
console.log("\n[SCENARIO 3] Traffic Constraint");
const ctx3: RecommendationContext = {
    riderId: "r3",
    poolingDensity: 0.8,
    trafficLevel: "HIGH", // Bad traffic
    behaviorProfile: getFreshProfile(),
    riderPreferences: { prefersPooling: true, maxDetourToleranceSec: 300 }
};

const res3 = recommendPooling(ctx3);
console.log(`Suggestion 3: ${res3.suggestion} (Confidence: ${res3.confidence})`);
// Expected: Lower confidence due to traffic, maybe still pool but marginally? Or nudge to SOLO?
// Traffic penalty is -0.2. Base ~0.5. Density +0.3. High Traffic -0.2. Pref +0.2. Net ~0.8?
// Wait: 0.5 + 0.3 - 0.2 + 0.2 = 0.8. Still high.
// But reason code should flag traffic.
if (res3.reasons.includes("HIGH_TRAFFIC_PENALTY")) {
    console.log("[PASS] Validated Traffic Penalty logic");
} else {
    console.error("[FAIL] Traffic penalty missing from reasons");
    process.exit(1);
}

console.log("\n--- All Recommendation Tests Passed ---");

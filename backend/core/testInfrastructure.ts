
import { getEffectiveCityConfig, adminUpdateCityConfig, adminAddOverride } from './cityConfig';

console.log("--- Testing Production Infrastructure (Phase F) ---");

// --- Scenario 1: Config Resolution ---
console.log("\n[SCENARIO 1] Config Resolution Logic");

// 1. Global Default for unknown city
const unknownConfig = getEffectiveCityConfig("UNKNOWN_CITY");
if (unknownConfig.poolingEnabled === true && unknownConfig.maxDiscountCap === 0.30) {
    console.log("[PASS] Global defaults applied correctly.");
} else {
    console.error(`[FAIL] Expected Global Defaults, got:`, unknownConfig);
    process.exit(1);
}

// 2. City Specific (BLR)
const blrConfig = getEffectiveCityConfig("BLR");
if (blrConfig.maxDiscountCap === 0.35) {
    console.log("[PASS] City specific config (BLR) applied.");
} else {
    console.error(`[FAIL] Expected BLR config (0.35), got:`, blrConfig);
    process.exit(1);
}

// 3. Admin Update (Hot Reload)
console.log("\n[ACTION] Admin disabling Pooling in BLR...");
adminUpdateCityConfig("BLR", { poolingEnabled: false });
const blrUpdated = getEffectiveCityConfig("BLR");
if (blrUpdated.poolingEnabled === false) {
    console.log("[PASS] Admin update applied instantly.");
} else {
    console.error(`[FAIL] Admin update failed.`);
    process.exit(1);
}

// 4. Festival Override (Diwali Surprise)
console.log("\n[ACTION] Adding Festival Override (Surge Lock)...");
const now = Date.now();
adminAddOverride({
    cityCode: "BLR",
    startTime: now - 1000,
    endTime: now + 5000, // Active now
    override: { surgeLock: true }
});

const festivalConfig = getEffectiveCityConfig("BLR", now);
if (festivalConfig.surgeLock === true && festivalConfig.poolingEnabled === false) {
    // Should have surgeLock=true (Override) AND poolingEnabled=false (City Config)
    console.log("[PASS] Festival override applied correctly over City Config.");
} else {
    console.error(`[FAIL] Override logic failed. Got:`, festivalConfig);
    process.exit(1);
}

// 5. Override Expiry
console.log("\n[CHECK] Override Expiry...");
const futureConfig = getEffectiveCityConfig("BLR", now + 10000); // 10s later
if (futureConfig.surgeLock === false) {
    // Should revert to City Config (false)
    console.log("[PASS] Override expired correctly.");
} else {
    console.error(`[FAIL] Override persisted past expiry.`);
    process.exit(1);
}

console.log("\n--- All Infrastructure Tests Passed ---");

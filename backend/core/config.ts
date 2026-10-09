
/**
 * operational control plane.
 * These are EMERGENCY BRAKES.
 * They are checked synchronously in critical paths to halt dangerous behavior instantly.
 * 
 * In production, these would be populated from process.env or a remote config cache.
 * For now, they are static defaults that can be toggled by tests/admins.
 */
export const CONFIG = {
    // Master Switch: Are multi-rider pools allowed at all?
    // If false: Simulation returns "POOLING_DISABLED", Consent throws.
    POOLING_ENABLED: true,

    // Financial Safety: Is the system allowed to lock prices?
    // If false: Commits abort back to SOLO, Consent throws.
    PRICE_LOCK_ENABLED: true, // Only allow if prices can be locked

    // --- Phase J: Payment Configuration ---
    PAYMENTS_ENABLED: true,    // Global Kill Switch
    CAPTURE_ENABLED: true,     // Emergency Switch: Stop taking money, keep rides running
    MAX_HOLD_AMOUNT: 500000,   // ₹5,000 Safety limit (in paise)

    // --- City Defaults (Can be overridden by DB) ---
    DEFAULT_CITY_CONFIG: {
        poolingEnabled: true,
        priceLockEnabled: true,
        maxDiscountCap: 0.35,
        surgeLock: false
    },

    // Margin Protection: What is the maximum percentage discount allowed off SOLO fare?
    // 0.35 = 35% max discount. Clamps aggressive pricing anomalies.
    MAX_DISCOUNT_CAP: 0.35
};

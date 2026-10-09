
/**
 * City Configuration Control Plane
 * 
 * Manages operational parameters per city/zone.
 * Allows instant kill-switches and temporary festival overrides.
 * 
 * Hierarchy:
 * 1. Global Defaults (Base)
 * 2. City Config (Persistent DB)
 * 3. Festival Overrides (Time-bound DB)
 */

export interface CityConfig {
    cityCode: string;
    poolingEnabled: boolean;
    priceLockEnabled: boolean;
    maxDiscountCap: number; // 0.0 to 1.0 (e.g. 0.35 = 35%)
    surgeLock: boolean; // If true, cap surge at 1.0x
    maxDetourSec: number; // For simulation/prod safety
}

// Default fallback if DB is unreachable or config missing
const GLOBAL_DEFAULT: CityConfig = {
    cityCode: 'DEFAULT',
    poolingEnabled: true,
    priceLockEnabled: true,
    maxDiscountCap: 0.30,
    surgeLock: false,
    maxDetourSec: 600
};

// Mock In-Memory Cache (In production, this would be Redis or LRU Cache)
const CITY_CONFIG_CACHE: Record<string, CityConfig> = {
    'BLR': { cityCode: 'BLR', poolingEnabled: true, priceLockEnabled: true, maxDiscountCap: 0.35, surgeLock: false, maxDetourSec: 600 },
    'DEL': { cityCode: 'DEL', poolingEnabled: true, priceLockEnabled: true, maxDiscountCap: 0.30, surgeLock: true, maxDetourSec: 600 }, // Surge locked in Delhi example
};

// Mock Overrides (Time-bound)
interface TimeBoundOverride {
    cityCode: string;
    startTime: number;
    endTime: number;
    override: Partial<CityConfig>;
}

const ACTIVE_OVERRIDES: TimeBoundOverride[] = [
    // Example: Diwali Surprise in Bangalore (Pooling disabled for safety 8pm-12am)
    // using a timestamp covering "now" for testing if needed
];

/**
 * Resolves the effective configuration for a city at a given time.
 * Logic: Global < City < Override
 */
export function getEffectiveCityConfig(cityCode: string, now: number = Date.now()): CityConfig {
    // 1. Start with Global
    let config = { ...GLOBAL_DEFAULT, cityCode };

    // 2. Merge City Config (if exists)
    const citySpecific = CITY_CONFIG_CACHE[cityCode];
    if (citySpecific) {
        config = { ...citySpecific };
    } else {
        // Fallback to Global identity
        config = { ...GLOBAL_DEFAULT };
    }

    // 3. Apply Active Overrides
    const applicableOverride = ACTIVE_OVERRIDES.find(o =>
        o.cityCode === cityCode &&
        now >= o.startTime &&
        now <= o.endTime
    );

    if (applicableOverride) {
        config = { ...config, ...applicableOverride.override };
    }

    return config;
}

/**
 * Admin: Update City Config (Mock DB Write)
 */
export function adminUpdateCityConfig(cityCode: string, update: Partial<CityConfig>) {
    const current = CITY_CONFIG_CACHE[cityCode] || { ...GLOBAL_DEFAULT, cityCode };
    CITY_CONFIG_CACHE[cityCode] = { ...current, ...update };
    console.log(`[ADMIN] Updated config for ${cityCode}:`, CITY_CONFIG_CACHE[cityCode]);
}

/**
 * Admin: Add Festival Override
 */
export function adminAddOverride(override: TimeBoundOverride) {
    ACTIVE_OVERRIDES.push(override);
    console.log(`[ADMIN] Added override for ${override.cityCode} until ${new Date(override.endTime).toISOString()}`);
}

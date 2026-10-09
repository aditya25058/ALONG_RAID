

export const MAX_DETOUR_SECONDS = 180; // Hard constraint for Rider A detour
export const ROUTE_CORRIDOR_BUFFER_KM = 0.5; // 500 meters for pruning
export const CONSENT_TTL_SECONDS = 8; // Time to Live for soft hold and consent
export const DEFAULT_FARE_PER_KM = 10; // Mock base fare per kilometer (for solo trip comparison)
export const DEFAULT_TRAFFIC_MULTIPLIER = 1.2; // Mock traffic impact on duration/fare
export const UNSAFE_PICKUP_ZONE_TYPES = ['highway', 'flyover', 'no-stopping']; // Mock unsafe zone types
export const MAX_ANGULAR_DEVIATION_THRESHOLD = 45; // degrees for destination alignment
export const GOOGLE_MAPS_API_KEY = 'AIzaSyD9YzQQWrGqQkycII6WhH6_asH4tZS_enA'; // Placeholder for Google Maps API Key

// Ultimate Dynamic Pricing Engine Factors
// Demand Score (D_s)
export const DEMAND_BASELINE = 100; // Expected baseline active requests for the area/time
// Supply Score (S_s) - Note: The formula uses (Drivers - Requests) not (availableDrivers - totalRequests) as per doc.
export const SUPPLY_REQUEST_BALANCE_FACTOR = 0.1; // Adjusts sensitivity of supply score (higher = steeper curve)

// Congestion (C_s)
export const CONGESTION_BASE_MULTIPLIER = 1.0;
export const CONGESTION_PER_LEVEL_INCREASE = 0.15; // 15% increase per congestion level unit

// Risk (R_s)
export const RISK_RAIN_MULTIPLIER = 0.08; // +8%
export const RISK_UNSAFE_ZONE_MULTIPLIER = 0.10; // +10%
export const RISK_LATENIGHT_MULTIPLIER = 0.05; // +5%
export const RISK_FESTIVAL_MULTIPLIER = 0.15; // +15%
export const MAX_RISK_MULTIPLIER_CLAMP = 1.30; // Max cumulative risk increase (30%)

// Forecast (F_s)
export const FORECAST_ALPHA = 0.5; // Sensitivity of forecast to predicted surge probability

// Ethics & Fairness Guard (E_s)
export const MIN_PRICE_MULTIPLIER_CLAMP = 0.8; // 0.8x
export const MAX_PRICE_MULTIPLIER_CLAMP_NORMAL = 2.5; // 2.5x (normal mode)
export const EMERGENCY_MODE_MULTIPLIER_CLAMP = 1.2; // 1.2x (emergency mode)
// Price Velocity Control: Acknowledged, but requires state for previous prices. Not implemented in stateless `paretoPricing`.

// New Constants for "Final Form" Matcher
// Value-Based Pruning (Stage 1)
export const PRUNING_STRESS_REQUESTS_THRESHOLD = 150; // If active requests exceed this, system is stressed
export const PRUNING_STRESS_DRIVERS_THRESHOLD = 60; // If available drivers fall below this, system is stressed
export const PRUNING_CORRIDOR_SHRINK_FACTOR = 0.5; // Reduce buffer by 50% under stress

// Surge-Aware Shared Savings (Stage 5)
export const HIGH_SURGE_PREDICTION_THRESHOLD = 0.6; // predictedSurgeProbability > 0.6 means high surge
export const REALTIME_DS_IMPACT_REDUCTION = 0.5; // Reduce impact of D_s * S_s by 50% if high surge predicted

// New Constants for Value-Based Redistribution / Shared Savings Split (DSMP-X, Page 11)
// Incremental Cost Components (approximate for simulation)
export const FUEL_COST_PER_KM_FACTOR = 0.2; // $/km for fuel
export const TIME_COST_PER_SECOND_FACTOR = 0.001; // $/second for driver's time
export const CONGESTION_RISK_PER_KM_FACTOR = 0.1; // $/km for additional congestion risk/wear-and-tear

// Shared Savings Split Percentages (Must sum to 1.0)
export const DRIVER_SHARED_SAVINGS_PERCENTAGE = 0.35; // Driver gets 35% of savings
export const RIDER_A_SHARED_SAVINGS_PERCENTAGE = 0.35; // Rider A gets 35% of savings
export const RIDER_C_SHARED_SAVINGS_PERCENTAGE = 0.30; // Rider C gets 30% of savings

// New Optimization Constants
// Case 11: "No Shared Value" optimizations
export const PLATFORM_FORWARD_LOOKING_SUBSIDY_AMOUNT = 2.00; // $2.00 subsidy if Rider C's dest is high demand and savings are marginal
export const MARGINAL_SAVINGS_THRESHOLD_FOR_SUBSIDY = 1.00; // If shared savings <= $1.00, consider subsidy

export const LOW_STRESS_TIME_COST_REDUCTION_FACTOR = 0.5; // Reduce time_cost factor by 50% in low-stress segments

// Case 12: "Negative Platform Margin" optimizations
export const MAX_ALLOWED_NEGATIVE_PLATFORM_MARGIN = 0.50; // -$0.50, platform might absorb for trust in early phase
export const DYNAMIC_SPLIT_REBALANCING_STEP = 0.01; // 1% step for rebalancing (fine-grained adjustment)

// New High-Accuracy Feature Constants
export const STANDARD_SEDAN_BOOT_UNITS = 4; // Example capacity
export const CORPORATE_TRUST_PREMIUM_BUFFER_INCREASE_FACTOR = 0.15; // 15% increase in route corridor buffer for corporate matches

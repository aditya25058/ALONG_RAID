
/**
 * Recommendation Engine -- Step 7 (Intelligence)
 * 
 * Provides pure advisory output for whether pooling is likely to be beneficial.
 * Factors in context (density, traffic) and user behavior (gaming, preference).
 * 
 * DESIGN:
 * - Pure function: recommendPooling()
 * - No side effects (Mutation forbidden)
 * - Returns explicit confidence and reason codes
 */

import { BehaviorProfile } from './behavior';
import { CONFIG } from './config';

export type RideSuggestion =
    | "START_POOL"
    | "JOIN_EXISTING_POOL"
    | "SOLO";


export interface PoolingRecommendation {
    suggestion: RideSuggestion;
    confidence: number; // 0..1
    reasons: string[];

    metadata: {
        modelVersion: string;
        signalsUsed: string[];
    };
}

export interface RecommendationContext {
    riderId: string;

    // Environment
    poolingDensity: number; // 0..1 (How many active rides nearby?)
    trafficLevel: "LOW" | "MEDIUM" | "HIGH";

    // User Signals (Step 8 Integration)
    behaviorProfile: BehaviorProfile;
    riderPreferences: {
        prefersPooling: boolean;
        maxDetourToleranceSec: number;
    };
}

// --- Rules & Weights ---
// Ideally these would be config or learnt. Hardcoded for pure logic implementation.
const POOLING_THRESHOLD_conf = 0.6; // Confidence needed to suggest pool
const SOLO_THRESHOLD_conf = 0.4; // Confidence below likely solo

/**
 * Pure function to calculate score.
 * Returns score 0..1 where 1 is "Definitely Pool" and 0 is "Definitely Solo"
 */
function calculatePoolingScore(ctx: RecommendationContext): { score: number, reasons: string[] } {
    let score = 0.5; // Neutral start
    const reasons: string[] = [];

    // 1. Density Check (High Impact)
    if (ctx.poolingDensity > 0.7) {
        score += 0.3;
        reasons.push("HIGH_POOL_DENSITY");
    } else if (ctx.poolingDensity < 0.2) {
        score -= 0.3;
        reasons.push("LOW_POOL_DENSITY");
    }

    // 2. Traffic Check (Penalty for High Traffic due to detour unpredictability)
    if (ctx.trafficLevel === "HIGH") {
        score -= 0.2;
        reasons.push("HIGH_TRAFFIC_PENALTY");
    }

    // 3. User Preference (Boost)
    if (ctx.riderPreferences.prefersPooling) {
        score += 0.2;
        reasons.push("RIDER_PREFERS_POOLING");
    }

    // 4. Behavior Check (Anti-Gaming Integration - Step 8)
    const { metrics } = ctx.behaviorProfile;

    // Attack 1: Price Probing (High probe rate -> User unlikely to accept, reduce pool confidence)
    if (metrics.priceProbeRate > 0.8) {
        score -= 0.4;
        reasons.push("HIGH_PROBE_RATE_PENALTY");
    }

    // Attack 2: Late Join Gaming (High late join ratio -> User prefers C role, maybe discourage starting A role?)
    // If we want them to START a pool, late join ratio might be irrelevant or a slight penalty if they ONLY want C.
    // Let's assume high late join ratio means they are opportunistic.
    // If density is high, they might get a C slot (JOIN_EXISTING).
    // If metrics.lateJoinRatio > 0.8, maybe boost JOIN_EXISTING specifically?
    // For general pooling score, it's neutral, but affects suggestion type.

    // Attack 3: Cancellation/Flakiness
    if (metrics.cancellationRate > 0.2) {
        score -= 0.5; // Huge penalty for flakes
        reasons.push("HIGH_CANCELLATION_PENALTY");
    }

    return { score, reasons };
}

export function recommendPooling(ctx: RecommendationContext): PoolingRecommendation {
    // LAW: Global Kill Switch
    if (!CONFIG.POOLING_ENABLED) {
        return {
            suggestion: "SOLO",
            confidence: 0,
            reasons: ["GLOBAL_POOLING_DISABLED"],
            metadata: { modelVersion: "rule_v1.0", signalsUsed: ["config"] }
        };
    }

    const { score, reasons } = calculatePoolingScore(ctx);

    // Clamp
    const confidence = Math.min(1, Math.max(0, score));

    let suggestion: RideSuggestion = "SOLO";

    // Logic to select suggestion
    if (confidence > POOLING_THRESHOLD_conf) {
        // High confidence for pooling.
        // Decide JOIN vs START based on density?
        if (ctx.poolingDensity > 0.5) {
            suggestion = "JOIN_EXISTING_POOL";
        } else {
            suggestion = "START_POOL";
        }
    } else if (confidence < SOLO_THRESHOLD_conf) {
        suggestion = "SOLO";
    } else {
        // Marginal case. Default to SOLO mostly, or nudge if preferences align.
        if (ctx.riderPreferences.prefersPooling) suggestion = "START_POOL";
        else suggestion = "SOLO";
    }

    return {
        suggestion,
        confidence,
        reasons,
        metadata: {
            modelVersion: "rule_v1.0", // Static version
            signalsUsed: ["density", "traffic", "preference", "behavior"]
        }
    };
}


/**
 * Behavioral Intelligence -- Step 8 (Adversarial Behavior)
 * 
 * Tracks accumulated signals about a user's interaction patterns.
 * Used to detect gaming, probing, and reliability issues without hard bans.
 * 
 * DESIGN:
 * - Pure data structures
 * - Pure update functions
 * - No side effects
 */

export interface BehaviorProfile {
    riderId: string;
    metrics: {
        // Attack 1: Price Probing
        // Ratio of (Consent Page Views / Rides Requested) or (Rejects / Total Views)
        priceProbeRate: number; // 0..1

        // Attack 2: Late Join Gaming
        // Ratio of (Joins as Rider C / Total Pooled Rides)
        lateJoinRatio: number; // 0..1

        // Attack 3: Fake Destinations / Flakiness
        // Ratio of (Aborts after Consent / Total Consents)
        cancellationRate: number; // 0..1

        // Reliability check
        consentReliability: number; // 0..1 (1 = reliable)

        // Raw counters for calculation (persisted)
        totalRides: number;
        totalPooledRides: number;
        totalConsentViews: number;
        totalConsentsGiven: number;
        totalLateJoins: number; // Joins as C/D/E
        totalCancellations: number; // Post-consent aborts
    };
    lastUpdated: number;
}

export type BehaviorEvent =
    | "VIEWED_CONSENT"
    | "GAVE_CONSENT"
    | "RIDE_COMPLETED_SOLO"
    | "RIDE_COMPLETED_POOL_STARTER" // A
    | "RIDE_COMPLETED_POOL_JOINER" // C
    | "CANCELLED_POST_CONSENT";

/**
 * Factory for new profiles
 */
export function createBehaviorProfile(riderId: string): BehaviorProfile {
    return {
        riderId,
        metrics: {
            priceProbeRate: 0,
            lateJoinRatio: 0,
            cancellationRate: 0,
            consentReliability: 1, // Start optimistic
            totalRides: 0,
            totalPooledRides: 0,
            totalConsentViews: 0,
            totalConsentsGiven: 0,
            totalLateJoins: 0,
            totalCancellations: 0
        },
        lastUpdated: Date.now()
    };
}

/**
 * Pure function to update profile based on events.
 * Returns a NEW profile.
 */
export function updateBehaviorProfile(profile: BehaviorProfile, event: BehaviorEvent): BehaviorProfile {
    const next = {
        ...profile,
        metrics: { ...profile.metrics },
        lastUpdated: Date.now()
    };

    const m = next.metrics;

    switch (event) {
        case "VIEWED_CONSENT":
            m.totalConsentViews++;
            break;
        case "GAVE_CONSENT":
            m.totalConsentsGiven++;
            break;
        case "RIDE_COMPLETED_SOLO":
            m.totalRides++;
            break;
        case "RIDE_COMPLETED_POOL_STARTER": // A
            m.totalRides++;
            m.totalPooledRides++;
            break;
        case "RIDE_COMPLETED_POOL_JOINER": // C
            m.totalRides++;
            m.totalPooledRides++;
            m.totalLateJoins++;
            break;
        case "CANCELLED_POST_CONSENT":
            m.totalCancellations++;
            break;
    }

    // Recalculate Ratios
    // 1. Price Probe Rate: Rejections / Views
    // Rejections = Views - ConsentsGiven? 
    // Or just simple View/Consent ratio.
    // Let's us define Probe Rate as 1 - (Consents / Views). High rate = Look but don't buy.
    if (m.totalConsentViews > 0) {
        m.priceProbeRate = 1 - (m.totalConsentsGiven / m.totalConsentViews);
    }

    // 2. Late Join Ratio
    if (m.totalPooledRides > 0) {
        m.lateJoinRatio = m.totalLateJoins / m.totalPooledRides;
    }

    // 3. Cancellation Rate
    // Cancels / Consents Given
    if (m.totalConsentsGiven > 0) {
        m.cancellationRate = m.totalCancellations / m.totalConsentsGiven;
    }

    // 4. Reliability
    // Inverse of cancellations, roughly.
    m.consentReliability = 1 - m.cancellationRate;

    return next;
}

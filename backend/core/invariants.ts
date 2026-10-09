import { RideState, RideStatus } from './stateMachine';
import { getEffectiveCityConfig } from './cityConfig';
import { Clock } from './time';
import { CONFIG } from './config';
import { Rider } from '../types';

export interface InvariantSnapshot {
    riders: {
        id: string;
        fare: number;
        soloFare: number;
        detourSec: number;
        marginalHarmSec: number;
        isConsentValid: boolean;
        isSafePickup: boolean;
    }[];
    driver: {
        earning: number;
        baseEarning: number;
    };
    platform: {
        margin: number;
    };
    capacity: {
        seatsRequired: number;
        seatsAvailable: number;
        bagsRequired: number;
        bagsAvailable: number;
    };
    cityConfig: {
        maxDiscountCap: number;
        maxDetourSec: number;
    };
}

export type InvariantResult =
    | { success: true }
    | { success: false; reason: string; code: string };

const PASS: InvariantResult = { success: true };
const FAIL = (code: string, reason: string): InvariantResult => ({ success: false, code, reason });

/**
 * Asserts that all core system invariants are met for a cluster.
 */
export function assertInvariants(state: InvariantSnapshot): InvariantResult {
    // 1-5. Combined Rider Checks
    for (const rider of state.riders) {
        // Consent & Safety
        if (!rider.isConsentValid) return FAIL("CONSENT_EXPIRED", `Rider ${rider.id} consent invalid.`);
        if (!rider.isSafePickup) return FAIL("UNSAFE_PICKUP", `Rider ${rider.id} pickup unsafe.`);

        // Time (Detour)
        const MAX_DETOUR = state.cityConfig.maxDetourSec;
        if (rider.detourSec > MAX_DETOUR) {
            return FAIL("TIME_VIOLATION", `Rider ${rider.id} detour ${rider.detourSec}s > ${MAX_DETOUR}s.`);
        }

        // Marginal Harm (Fairness)
        const MAX_HARM = 180; // 3 minutes harm cap
        if (rider.marginalHarmSec > MAX_HARM) {
            return FAIL("FAIRNESS_VIOLATION", `Rider ${rider.id} marginal harm ${rider.marginalHarmSec}s > ${MAX_HARM}s.`);
        }

        // Fairness (Fare vs Solo)
        if (rider.fare >= rider.soloFare) {
            return FAIL("PRICE_VIOLATION", `Rider ${rider.id} fare ₹${rider.fare} is not lower than solo ₹${rider.soloFare}.`);
        }
    }

    // 6. Driver Fairness
    if (state.driver.earning < state.driver.baseEarning) {
        return FAIL("DRIVER_LOSS", `Driver earning ₹${state.driver.earning} < base ₹${state.driver.baseEarning}.`);
    }

    // 7. Platform Sustainability
    if (state.platform.margin < 0) {
        return FAIL("NEGATIVE_MARGIN", `Platform margin ₹${state.platform.margin} is negative.`);
    }

    // 8. Physical Capacity (Seats)
    if (state.capacity.seatsRequired > state.capacity.seatsAvailable) {
        return FAIL("CAPACITY_EXCEEDED", `Required seats ${state.capacity.seatsRequired} > available ${state.capacity.seatsAvailable}.`);
    }

    // 9. Physical Capacity (Bags)
    if (state.capacity.bagsRequired > state.capacity.bagsAvailable) {
        return FAIL("BOOT_CAPACITY_EXCEEDED", `Required bags ${state.capacity.bagsRequired} > available ${state.capacity.bagsAvailable}.`);
    }

    return PASS;
}

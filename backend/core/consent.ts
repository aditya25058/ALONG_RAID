
import { Clock } from './time';
import { LatLng } from '../types';
import * as crypto from 'crypto';

/**
 * ConsentToken: A time-bound, route-bound, price-bound contract.
 * Represents agreement from a specific actor (Rider A, Rider C, or Driver).
 */
export interface ConsentToken {
    rideId: string;
    actorId: string;
    agreedPrice: number;
    agreedRouteHash: string;
    expiresAt: number; // Defaults to Clock.now() + CONSENT_TTL_SECONDS
    createdAt: number;
}

const CONSENT_TTL_MS = 30_000; // 30 seconds to agree

/**
 * Generates a deterministic hash for a given route.
 * Order and precision of LatLng points matters.
 */
export function hashRoute(route: LatLng[]): string {
    if (!route || route.length === 0) return 'EMPTY_ROUTE';

    // Create a canonical string representation
    // Precision matters: let's fix to 3 decimal places (~100m) to tolerate GPS jitter
    // while still detecting meaningful route changes or jumps (e.g. 200m+).
    const routeString = route.map(p => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('|');

    // Use SHA-256 for collision resistance (MD5 is faster but SHA is safer standard)
    return crypto.createHash('sha256').update(routeString).digest('hex').substring(0, 16); // Short hash is fine for this context
}

/**
 * Mints a new ConsentToken.
 */
export function createConsentToken(
    rideId: string,
    actorId: string,
    price: number,
    route: LatLng[],
    ttlMs: number = CONSENT_TTL_MS
): ConsentToken {
    const now = Clock.now();
    return {
        rideId,
        actorId,
        agreedPrice: price,
        agreedRouteHash: hashRoute(route),
        createdAt: now,
        expiresAt: now + ttlMs
    };
}

export type ConsentValidationResult =
    | { valid: true }
    | { valid: false; reason: 'EXPIRED' | 'PRICE_MISMATCH' | 'ROUTE_MISMATCH' | 'INVALID_TOKEN' };

/**
 * strictly validates a token against current reality.
 */
export function validateConsentToken(
    token: ConsentToken,
    currentPrice: number,
    currentRoute: LatLng[],
    now: number = Clock.now()
): ConsentValidationResult {

    if (!token) return { valid: false, reason: 'INVALID_TOKEN' };

    // 1. Check Expiration
    if (now > token.expiresAt) {
        return { valid: false, reason: 'EXPIRED' };
    }

    // 2. Check Price (Exact match - float safe if using integers, but strict if using floats)
    if (token.agreedPrice !== currentPrice) {
        return { valid: false, reason: 'PRICE_MISMATCH' };
    }

    // 3. Check Route Hash
    const currentHash = hashRoute(currentRoute);
    if (token.agreedRouteHash !== currentHash) {
        return { valid: false, reason: 'ROUTE_MISMATCH' };
    }

    return { valid: true };
}

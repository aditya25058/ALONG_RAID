
import { RideState, RideStatus } from './stateMachine';
import { LatLng, Rider, Driver } from '../types';

/**
 * Public Data Transfer Object for a Ride.
 * Stripped of internal hashes, seeds, and restricted data.
 */
export interface RideView {
    rideId: string;
    cityCode: string;
    status: RideStatus;
    route: LatLng[];
    riders: {
        primary: { id: string; name: string };
        pooled: { id: string; name: string }[];
    };
    driver: { id: string; name: string; carModel: string };
    pricing?: {
        myFare: number;
        isPromoApplied: boolean;
    };
    etaMinutes?: number;
}

/**
 * Transforms internal RideState into a safe RideView for a specific user.
 * Prevents Information Leakage.
 */
export function toRideView(state: RideState, viewerId: string): RideView {
    // 1. Identify context
    const isPrimary = state.riders.primary.id === viewerId;
    const pooledRider = state.riders.pooled?.find(r => r.id === viewerId);

    // 2. Base View
    const view: RideView = {
        rideId: state.rideId,
        cityCode: state.cityCode,
        status: state.status,
        route: state.route, // Only show committed route
        riders: {
            primary: { id: state.riders.primary.id, name: state.riders.primary.name },
            pooled: (state.riders.pooled || []).map(r => ({ id: r.id, name: r.name }))
        },
        driver: {
            id: state.driver.id,
            name: state.driver.name,
            carModel: "Premium Sedan" // Hardcoded detail for View abstraction
        }
    };

    // 3. User-Specific Pricing View
    if (isPrimary && state.pricing) {
        view.pricing = {
            myFare: state.pricing.riderAFare,
            isPromoApplied: (state.pricing.riderAFare < state.pricing.riderASoloFare)
        };
    } else if (pooledRider && state.pricing) {
        view.pricing = {
            myFare: state.pricing.riderCFare,
            isPromoApplied: true
        };
    }

    return view;
}

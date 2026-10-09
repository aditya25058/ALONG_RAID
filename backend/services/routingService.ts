
import { LatLng } from '../types';
import { MAX_ANGULAR_DEVIATION_THRESHOLD, DEFAULT_TRAFFIC_MULTIPLIER } from '../constants';

/**
 * Calculates the Great Circle distance (Haversine formula) between two points in kilometers.
 * @pure
 */
export function calculateDistanceKm(p1: LatLng, p2: LatLng): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        (1 - Math.cos(dLng)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Calculates the estimated time to traverse a path given a base driver speed.
 * @pure
 */
export function calculateRouteTime(path: LatLng[], driverSpeedKmH: number): number {
    if (path.length < 2) return 0;
    let totalDistanceKm = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalDistanceKm += calculateDistanceKm(path[i], path[i + 1]);
    }
    const effectiveSpeedKmH = driverSpeedKmH / DEFAULT_TRAFFIC_MULTIPLIER;
    return (totalDistanceKm / effectiveSpeedKmH) * 3600;
}

/**
 * Calculates the angular deviation between three points (Origin -> Dest1 vs Origin -> Dest2).
 * @pure
 */
export function calculateAngularDeviation(origin: LatLng, dest1: LatLng, dest2: LatLng): number {
    const v1 = { x: dest1.lng - origin.lng, y: dest1.lat - origin.lat };
    const v2 = { x: dest2.lng - origin.lng, y: dest2.lat - origin.lat };
    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    const cosTheta = dotProduct / (magnitude1 * magnitude2);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
    return angleRad * 180 / Math.PI;
}

/**
 * Checks if a pickup point is within a buffer distance of a route.
 * @pure
 */
export function nearRoute(pickup: LatLng, route: LatLng[], currentVehicleLocation: LatLng, bufferKm: number): boolean {
    for (const point of route) {
        if (calculateDistanceKm(pickup, point) < bufferKm) return true;
    }
    if (calculateDistanceKm(pickup, currentVehicleLocation) < bufferKm * 1.5) return true;
    return false;
}

/**
 * Checks if a point is within a dynamic elliptical spine defined by start and end points.
 * @pure
 */
export function isNearSpine(point: LatLng, start: LatLng, end: LatLng, radiusKm: number, sis = 100): boolean {
    let effectiveRadius = radiusKm;
    if (sis < 50) effectiveRadius *= 0.5; // Tighten spine by 50% in Defensive Mode

    const d_start = calculateDistanceKm(point, start);
    const d_end = calculateDistanceKm(point, end);
    const d_total = calculateDistanceKm(start, end);
    if (d_start > d_total || d_end > d_total) return Math.min(d_start, d_end) < radiusKm;
    const s = (d_start + d_end + d_total) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - d_start) * (s - d_end) * (s - d_total)));
    const h = (2 * area) / d_total;
    return h < radiusKm;
}

/**
 * Checks if the new rider's destination is aligned with the existing destination within a threshold.
 * @pure
 */
export function destinationAligned(newRiderDest: LatLng, existingRiderDest: LatLng, driverCurrentLoc: LatLng): boolean {
    const angle = calculateAngularDeviation(driverCurrentLoc, existingRiderDest, newRiderDest);
    return angle <= MAX_ANGULAR_DEVIATION_THRESHOLD;
}

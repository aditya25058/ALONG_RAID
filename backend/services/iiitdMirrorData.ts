
import { Rider, LatLng } from '../types';

const NODES: Record<string, LatLng> = {
    IIITD: { lat: 28.5459, lng: 77.2732 },
    GOVINDPURI_METRO: { lat: 28.5447, lng: 77.2641 },
    OKHLA_METRO: { lat: 28.5359, lng: 77.2847 },
    CYBERHUB: { lat: 28.4951, lng: 77.0877 },
    NEHRU_PLACE: { lat: 28.5494, lng: 77.2528 }
};

export function generateGhostRiders(count: number): Rider[] {
    const riders: Rider[] = [];
    for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let pickup, destination;

        // Spatial Distribution
        if (rand < 0.4) { // IIITD -> CyberHub / Nehru Place
            pickup = NODES.IIITD;
            destination = Math.random() > 0.5 ? NODES.CYBERHUB : NODES.NEHRU_PLACE;
        } else if (rand < 0.8) { // Metro -> IIITD
            pickup = Math.random() > 0.5 ? NODES.GOVINDPURI_METRO : NODES.OKHLA_METRO;
            destination = NODES.IIITD;
        } else { // Corporate -> Metro/Home
            pickup = NODES.NEHRU_PLACE;
            destination = NODES.GOVINDPURI_METRO;
        }

        riders.push({
            id: `ghost_${i}`,
            name: `Ghost Rider ${i}`,
            pickup,
            destination,
            requestedSeats: Math.ceil(Math.random() * 2),
            requestedBagUnits: Math.floor(Math.random() * 4),
            status: 'POOLING_REQUEST',
            isAadhaarVerified: true,
            averageRating: 4.5 + Math.random() * 0.5
        });
    }
    return riders;
}

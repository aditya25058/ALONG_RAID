import { ChaosProfile, ChaosProfiles } from '../types';
import * as crypto from 'crypto';

/**
 * DETERMINISTIC CHAOS ENGINE (The Bangalore Standard)
 * Manages mobility profiles for Indian urban entropy.
 */
export class ChaosEngine {
    /**
     * Resolves the chaos profile for a given context or request.
     */
    static getProfile(profileId?: string): ChaosProfile {
        return ChaosProfiles[profileId || 'NORMAL'] || ChaosProfiles['NORMAL'];
    }

    /**
     * Generates a deterministic fingerprint for a profile and seed.
     * Used for regulator-grade auditability.
     */
    static getFingerprint(profile: ChaosProfile, seed: number): string {
        const payload = JSON.stringify({ id: profile.id, seed });
        return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 12);
    }
}

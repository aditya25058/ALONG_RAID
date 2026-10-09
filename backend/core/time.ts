
/**
 * Time Provider - Phase H (Production Hardening)
 * 
 * Abstracting time allows for deterministic testing and simulation.
 * In production, this wraps Date.now().
 * In tests, this allows "Step-based" or "Frozen" time.
 */

export interface TimeProvider {
    now(): number;
}

export const RealTimeProvider: TimeProvider = {
    now: () => Date.now()
};

export class DeterministicTimeProvider implements TimeProvider {
    private _currentTime: number;

    constructor(initialTime: number = Date.now()) {
        this._currentTime = initialTime;
    }

    now(): number {
        return this._currentTime;
    }

    advance(ms: number) {
        this._currentTime += ms;
    }

    set(time: number) {
        this._currentTime = time;
    }
}

// Global clock instance. Default to Real Time.
export let Clock: TimeProvider = RealTimeProvider;

/**
 * Injection method for testing.
 * @param provider The TimeProvider to use.
 */
export function setClock(provider: TimeProvider) {
    Clock = provider;
}

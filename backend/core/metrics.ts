
/**
 * Observability Metrics - Phase H (Reality Check)
 * 
 * DESIGN:
 * - Never throw: Failing to log a metric must not crash a ride.
 * - Simple interface: increment, timing, gauge (for future).
 * - Pluggable backend: Console for now, Prometheus/StatsD later.
 */

export interface MetricsService {
    increment(metricName: string, tags?: Record<string, string>): void;
}

class ConsoleMetricsService implements MetricsService {
    increment(metricName: string, tags: Record<string, string> = {}): void {
        try {
            // In a real system, this would be a StatsD call or Prom client.
            // For now, structured log to stdout is fine.
            // console.log(`[METRIC] ${metricName} ${JSON.stringify(tags)}`);
            // Actually, let's keep it silent unless errors occur, or dedicated log level
        } catch (e) {
            // Swallow
        }
    }
}

export const metrics = new ConsoleMetricsService();

/**
 * Safe wrapper for metric increments.
 */
export function count(metricName: string, tags: Record<string, string> = {}) {
    try {
        metrics.increment(metricName, tags);
    } catch (e) {
        // Absolute safety guarantee for call sites
    }
}

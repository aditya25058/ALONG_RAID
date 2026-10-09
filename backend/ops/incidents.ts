
/**
 * ALONG Incident Taxonomy - Phase K
 * 
 * "If you can't name an incident, you can't respond to it."
 * 
 * These enums are used for:
 * - Logs & Metrics
 * - Dashboards & Alerts
 * - DB Incident Locks
 */

export enum IncidentType {
    PAYMENT_PROVIDER_OUTAGE = "PAYMENT_PROVIDER_OUTAGE",
    PRICE_MISMATCH_SPIKE = "PRICE_MISMATCH_SPIKE",
    CONSENT_TIMEOUT_SPIKE = "CONSENT_TIMEOUT_SPIKE",
    DRIVER_REJECTION_ABUSE = "DRIVER_REJECTION_ABUSE",
    ROUTE_INTEGRITY_FAILURE = "ROUTE_INTEGRITY_FAILURE",
    DB_LATENCY_CRITICAL = "DB_LATENCY_CRITICAL",
    SAFETY_EMERGENCY = "SAFETY_EMERGENCY",
}

export enum IncidentSeverity {
    P0 = "P0", // Critical - Service Down / Money Leaking
    P1 = "P1", // High - Degraded Experience
    P2 = "P2", // Medium - Localized issue
}

export interface IncidentRecord {
    id: string;
    type: IncidentType;
    severity: IncidentSeverity;
    startTime: number;
    endTime?: number;
    description: string;
    commanderId: string; // The human in charge
}

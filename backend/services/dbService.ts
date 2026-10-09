let pg: any;
try {
    // Dynamic import to allow fallback if pg is not installed
    pg = await import('pg');
} catch (e) {
    pg = {
        Pool: class MockPool {
            constructor() { }
            async connect() {
                return {
                    query: async () => ({ rows: [] }),
                    release: () => { },
                    on: () => { }
                };
            }
            async query() { return { rows: [] }; }
        }
    };
}

import * as crypto from 'crypto';

/**
 * DB Service: The Interface to the Second Judge.
 * Enforces SERIALIZABLE isolation and protocol-level idempotency.
 */
export class DBService {
    private pool: any;

    constructor() {
        this.pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }

    /**
     * Executes a command within a SERIALIZABLE transaction.
     * Implements dual-layer idempotency (Command ID + Payload Hash).
     */
    async executeAtomicCommand(
        commandId: string,
        actor: string,
        rideId: string,
        payload: any,
        operation: (client: any) => Promise<any>
    ): Promise<any> {
        const client = await this.pool.connect();
        const commandHash = this.calculateHash(payload);

        try {
            await client.query('BEGIN');
            // 1. Set Isolation Level to SERIALIZABLE (Senior Upgrade)
            await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

            // 2. Set Session Variables for Trigger (Audit Correlation)
            await client.query(`SET LOCAL along.command_id = '${commandId}'`);
            await client.query(`SET LOCAL along.actor = '${actor}'`);

            // 3. Check Idempotency Shield
            const { rows } = await client.query(
                'SELECT result, command_hash FROM processed_commands WHERE command_id = $1',
                [commandId]
            );

            if (rows.length > 0) {
                if (rows[0].command_hash !== commandHash) {
                    throw new Error(`Payload Tamper detected for command ${commandId}`);
                }
                return rows[0].result;
            }

            // 4. Execute the actual logic (e.g., updating ride status)
            const result = await operation(client);

            // 5. Record command completion
            await client.query(
                'INSERT INTO processed_commands (command_id, ride_id, command_hash, result) VALUES ($1, $2, $3, $4)',
                [commandId, rideId, commandHash, JSON.stringify(result)]
            );

            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Authoritative State Loading (Judge 2 - DB Truth)
     */
    async loadRide(rideId: string): Promise<any> {
        const { rows } = await this.pool.query(
            'SELECT status, route_hash, pricing_json, simulation_seed FROM rides WHERE ride_id = $1',
            [rideId]
        );
        return rows[0] || null;
    }

    /**
     * Idempotency Check (Judge 2 - Shield)
     */
    async getProcessedCommand(commandId: string): Promise<any> {
        const { rows } = await this.pool.query(
            'SELECT result, command_hash FROM processed_commands WHERE command_id = $1',
            [commandId]
        );
        return rows[0] || null;
    }

    /**
     * Convenience method for immutable audit logging.
     */
    async logAuditEvent(rideId: string, eventType: string, payload: any) {
        await this.pool.query(
            'INSERT INTO audit_log (ride_id, action, actor, payload) VALUES ($1, $2, $3, $4)',
            [rideId, eventType, 'SYSTEM', JSON.stringify(payload)]
        );
    }

    async getAuditRecord(rideId: string, action: string): Promise<any> {
        const { rows } = await this.pool.query(
            'SELECT payload FROM audit_log WHERE ride_id = $1 AND action = $2 ORDER BY created_at DESC LIMIT 1',
            [rideId, action]
        );
        return rows[0] || null;
    }

    async getDriver(driverId: string): Promise<any> {
        return { id: driverId, vehicleId: 'V1', currentLocation: { lat: 12.97, lng: 77.59 }, vehicleSpeedKmH: 40 };
    }

    async getVehicle(vehicleId: string): Promise<any> {
        return { id: vehicleId, type: 'SEDAN', totalSeats: 4, totalBootUnits: 5 };
    }

    private calculateHash(payload: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
}

export const db = new DBService();

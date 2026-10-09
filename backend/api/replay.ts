import { db } from '../services/dbService';
import { simulateInsertC } from '../core/simulation';
import { RideState } from '../core/stateMachine';
import * as crypto from 'crypto';

/**
 * THE REPLAY VERIFIER (READ-ONLY)
 */
export async function replayRouter(req: any, res: any) {
    const { rideId } = req.body;

    try {
        const audit = await db.getAuditRecord(rideId, 'COMMIT_POOL');
        if (!audit) {
            return res.status(404).json({ success: false, error: "AUDIT_RECORD_NOT_FOUND" });
        }

        const payload = JSON.parse(audit.payload);
        const { simulation, signature } = payload;

        const expectedSignature = crypto.createHmac('sha256', 'REGULATOR_SHARED_SECRET')
            .update(JSON.stringify({
                commandType: payload.commandType,
                simulation: payload.simulation,
                result: payload.result
            }))
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(403).json({ success: false, error: "AUDIT_TAMPERED" });
        }

        const rideFromDb = await db.loadRide(rideId);
        const driver = await db.getDriver(rideFromDb.driver_id);
        const vehicle = await db.getVehicle(driver.vehicleId);

        const mockState: RideState = {
            rideId,
            cityCode: 'DEFAULT',
            status: "SOLO_ACTIVE",
            route: [],
            driver: driver,
            riders: [simulation.inputs.primaryRider],
            stops: [
                { id: 'P1', riderId: simulation.inputs.primaryRider.id, location: simulation.inputs.primaryRider.pickup, type: 'PICKUP' },
                { id: 'D1', riderId: simulation.inputs.primaryRider.id, location: simulation.inputs.primaryRider.destination, type: 'DROPOFF' }
            ],
            timestamps: { createdAt: Date.now() },
            simulationSeed: simulation.seed
        } as any;

        const replayResult = await simulateInsertC(
            mockState,
            simulation.inputs.candidate,
            vehicle,
            { congestionLevel: 0.2 } as any,
            simulation.seed
        );

        const match = replayResult.invariantResult.success === payload.result.invariantResult.success;

        return res.status(200).json({
            success: true,
            match,
            recomputed: replayResult.invariantResult,
            original: payload.result.invariantResult
        });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: "REPLAY_FAILURE", message: e.message });
    }
}

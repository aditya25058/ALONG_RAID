import { executeCommand, Command } from '../core/commands';

/**
 * THE SINGLE GATEKEEPER
 * All mutations go through exactly one endpoint: POST /command
 */
export async function commandRouter(req: any, res: any) {
    try {
        const command = parseAndValidate(req.body);

        if (!command) {
            return res.status(400).json({
                success: false,
                error: "INVALID_COMMAND_ENVELOPE",
                requiredFields: ["requestId", "type", "rideId", "actorId", "payload"]
            });
        }

        // The Router has zero business logic. It only delegates.
        const result = await executeCommand(command);

        // Return 200 for safe replays, 409 for conflicts/tampers, 400 for logic errors
        const statusCode = result.success ? 200 : (result.error?.includes('TAMPERED') ? 409 : 400);

        return res.status(statusCode).json(result);

    } catch (e: any) {
        return res.status(500).json({ success: false, error: "GATEKEEPER_CRITICAL_FAILURE", message: e.message });
    }
}

/**
 * Validates the Command Envelope.
 * Mirrors financial system strictness.
 */
function parseAndValidate(body: any): Command | null {
    if (!body || typeof body !== 'object') return null;

    const { requestId, type, rideId, actorId, payload } = body;

    if (!requestId || !type || !rideId || !actorId || !payload) {
        return null;
    }

    // Explicit Type Casting & Validation
    return {
        requestId,
        type,
        rideId,
        actorId,
        payload
    } as Command;
}

import React, { useState } from 'react';

/**
 * DISPUTE REPLAY UI (MOCK)
 * regulator-grade interface for bit-perfect verification.
 */
export function DisputeReplayUI() {
    const [rideId, setRideId] = useState("");
    const [result, setResult] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);

    const handleVerify = async () => {
        setVerifying(true);
        // Mocking API call to /replay
        setTimeout(() => {
            setResult({
                match: true,
                fingerprint: "sha256(simulation.ts@v1.2.0-deterministic)",
                recomputed: { price: 214, status: "PASS" },
                original: { price: 214 },
                lineage: [
                    { step: "Evidence Loaded", status: "OK", data: "Seed: 12345" },
                    { step: "Signature Verified", status: "OK", data: "HMAC: 8a3f..." },
                    { step: "Pure Logic Re-run", status: "OK", data: "Re-derived Price: ₹214" },
                    { step: "Verdict", status: "MATCHED" }
                ]
            });
            setVerifying(false);
        }, 1500);
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#0A0A0A', color: '#FFF', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #333' }}>
            <h2 style={{ color: '#00FFA3', fontSize: '1.2rem', marginBottom: '20px' }}>⚖️ ALONG REGULATOR | DISPUTE REPLAY VERIFIER</h2>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>RIDEID / AUDIT TOKEN</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={rideId}
                        onChange={(e) => setRideId(e.target.value)}
                        placeholder="e.g. 550e8400-e29b-.."
                        style={{ flex: 1, backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '10px', borderRadius: '4px' }}
                    />
                    <button
                        onClick={handleVerify}
                        disabled={!rideId || verifying}
                        style={{ backgroundColor: '#00FFA3', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', opacity: (!rideId || verifying) ? 0.5 : 1 }}
                    >
                        {verifying ? 'RECOMPUTING...' : 'VERIFY TRUTH'}
                    </button>
                </div>
            </div>

            {result && (
                <div style={{ border: '1px solid #333', padding: '16px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>ENGINE FINGERPRINT</div>
                            <div style={{ fontSize: '0.9rem', color: '#00FFA3' }}>{result.fingerprint.substring(0, 32)}...</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.match ? '#00FFA3' : '#FF4D4D' }}>
                                {result.match ? '✅ VERIFIED' : '❌ MISMATCH'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, backgroundColor: '#111', padding: '12px', borderLeft: '4px solid #333' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>RECORDED PRICE</div>
                            <div style={{ fontSize: '1.4rem' }}>₹{result.original.price}</div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#111', padding: '12px', borderLeft: '4px solid #00FFA3' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>RECOMPUTED PRICE</div>
                            <div style={{ fontSize: '1.4rem' }}>₹{result.recomputed.price}</div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px' }}>LINEAGE OF TRUTH</div>
                        {result.lineage.map((l: any, i: number) => (
                            <div key={i} style={{ display: 'flex', borderBottom: '1px solid #222', padding: '8px 0', fontSize: '0.9rem' }}>
                                <div style={{ width: '30px', color: '#888' }}>{i + 1}.</div>
                                <div style={{ flex: 1 }}>{l.step}</div>
                                <div style={{ color: '#00FFA3' }}>{l.status}</div>
                                <div style={{ width: '150px', textAlign: 'right', color: '#888', fontSize: '0.8rem' }}>{l.data}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

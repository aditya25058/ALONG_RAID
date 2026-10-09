import React, { useState } from 'react';
import { DisputeReplayUI } from '../backend/api/DisputeReplayUI';
import { Shield, Zap, RefreshCw, CheckCircle2, TrendingUp, AlertTriangle, Layers, Navigation } from 'lucide-react';

interface SimulatedRide {
  id: string;
  riderA: string;
  riderB: string;
  status: 'POOL_PROPOSED' | 'COMMITTED' | 'COMPLETED';
  origPrice: number;
  pooledPrice: number;
  detourSec: number;
  rebate: number;
  sisScore: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'dispute'>('simulator');
  const [isRunning, setIsRunning] = useState(false);
  const [sisScore, setSisScore] = useState(0.98);
  const [rides, setRides] = useState<SimulatedRide[]>([
    {
      id: 'RIDE-BLR-8921',
      riderA: 'Priya K. (Koramangala)',
      riderB: 'Rahul S. (HSR Layout)',
      status: 'COMMITTED',
      origPrice: 340,
      pooledPrice: 214,
      detourSec: 85,
      rebate: 45,
      sisScore: 0.98
    },
    {
      id: 'RIDE-NCR-4412',
      riderA: 'Arjun M. (Okhla Phase III)',
      riderB: 'Sneha D. (CyberHub)',
      status: 'COMPLETED',
      origPrice: 420,
      pooledPrice: 265,
      detourSec: 110,
      rebate: 62,
      sisScore: 0.96
    }
  ]);

  const runProtocolSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const newRide: SimulatedRide = {
        id: `RIDE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        riderA: 'Vikram N. (Indiranagar)',
        riderB: 'Ananya T. (Bellandur)',
        status: 'COMMITTED',
        origPrice: 380,
        pooledPrice: 238,
        detourSec: Math.floor(60 + Math.random() * 50),
        rebate: 52,
        sisScore: +(0.95 + Math.random() * 0.04).toFixed(2)
      };
      setRides(prev => [newRide, ...prev]);
      setSisScore(+(0.96 + Math.random() * 0.03).toFixed(2));
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/10 px-8 py-4 bg-black/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FFA3] to-[#00B4D8] flex items-center justify-center font-black text-black text-xl shadow-lg shadow-[#00FFA3]/20">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ALONG PROTOCOL <span className="text-xs px-2 py-0.5 rounded bg-[#00FFA3]/20 text-[#00FFA3] font-mono">v1.2-STABLE</span>
            </h1>
            <p className="text-xs text-slate-400">Institutional Mid-Ride Pooling & Beckn TRV10 Gateway</p>
          </div>
        </div>

        {/* Tab Switcher & Header Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'simulator' ? 'bg-[#00FFA3] text-black shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Corridor Simulator
            </button>
            <button
              onClick={() => setActiveTab('dispute')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'dispute' ? 'bg-[#00FFA3] text-black shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Dispute Replay
            </button>
          </div>

          <button
            onClick={runProtocolSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 bg-[#00FFA3] hover:bg-[#00FFA3]/90 text-black px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-[#00FFA3]/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'OPTIMIZING POOL...' : 'RUN PROTOCOL'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* KPI Header Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>System Integrity (SIS)</span>
              <Shield className="w-4 h-4 text-[#00FFA3]" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{(sisScore * 100).toFixed(1)}%</div>
            <div className="text-xs text-[#00FFA3] flex items-center gap-1 mt-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Anti-Cartel Active
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Driver Yield Delta</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">+24.6%</div>
            <div className="text-xs text-slate-400 mt-1">Marginal Margin Preserved</div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Rider Fare Discount</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">-37.2%</div>
            <div className="text-xs text-slate-400 mt-1">Shared Value Pool Rebate</div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Beckn Interop Node</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">TRV10 LIVE</div>
            <div className="text-xs text-slate-400 mt-1">Ed25519 Signatures Verified</div>
          </div>
        </section>

        {activeTab === 'dispute' ? (
          <section className="bg-black/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <DisputeReplayUI />
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Corridor Pool Queue */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#00FFA3]" /> Active Corridor Matches
                  </h2>
                  <p className="text-xs text-slate-400">Dynamic mid-ride pooling queue under Pareto pricing</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20 font-mono">
                  {rides.length} Batches Synced
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {rides.map(ride => (
                  <div key={ride.id} className="bg-black/40 border border-white/5 hover:border-white/20 p-4 rounded-xl flex items-center justify-between transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-300">{ride.id}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ride.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2 space-y-0.5">
                        <p>👤 Primary: <span className="text-slate-200">{ride.riderA}</span></p>
                        <p>👥 Co-Rider: <span className="text-slate-200">{ride.riderB}</span></p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-xs line-through text-slate-500 font-mono">₹{ride.origPrice}</span>
                        <span className="text-lg font-bold font-mono text-[#00FFA3]">₹{ride.pooledPrice}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Detour: <span className="text-amber-300 font-mono">+{ride.detourSec}s</span> • Rebate: <span className="text-[#00FFA3] font-mono">₹{ride.rebate}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SIS: {(ride.sisScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol Invariant Status Panel */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00FFA3]" /> Institutional Invariants
              </h2>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Luggage Boot Guard</span>
                    <span className="text-emerald-400 font-mono">PASS (100%)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Strict physical trunk capacity audit preventing luggage rejection at pickup.</p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Marginal Harm Boundary</span>
                    <span className="text-emerald-400 font-mono">&lt; 120s MAX</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">No active rider detour exceeds pre-consented SLA thresholds.</p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Cryptographic Consent</span>
                    <span className="text-emerald-400 font-mono">SHA-256 HASH</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Multi-party consent verified prior to real-time route mutation commit.</p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Anti-Cartel Defense</span>
                    <span className="text-emerald-400 font-mono">ACTIVE</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Surge smoothing actively dampens coordinated multi-agent price manipulation.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-4 bg-black/40 text-center text-xs text-slate-500">
        ALONG Institutional Ride-Sharing Protocol • Open Network for Digital Commerce (ONDC) Compliant
      </footer>
    </div>
  );
}

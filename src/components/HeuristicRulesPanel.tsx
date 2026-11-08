import React from 'react';
import { ArrowRight, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const HeuristicRulesPanel: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Title & Overview */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-white">
          AML / CFT Heuristic Rules Architecture
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Operating under the DASP (Digital Asset Service Provider) regulatory framework administered by CNAD in El Salvador. These three autonomous heuristics continuously evaluate transaction graph topology, on-chain velocity, and historical entity profiles.
        </p>
      </div>

      {/* 3 Heuristic Rules Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rule 1: Smurfing Rule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Rule 01 · Structuring
            </span>
            <span className="text-[11px] font-mono text-slate-400">Score Impact: +45</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Smurfing &amp; Pass-Through Path</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Detects if a low-flow wallet deviates from its standard 2-node pattern (<code className="text-emerald-400">Origin → Destination</code>) into a 3-node path (<code className="text-rose-400">Origin → Pass-Through → Destination</code>).
            </p>
          </div>

          {/* Visual Topology Diagram */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-3 font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase text-emerald-400 font-semibold mb-1">
                Normal Flow (2 Nodes):
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">Origin</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">Destination</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] uppercase text-rose-400 font-semibold mb-1">
                Smurfing Deviation (3+ Nodes):
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 flex-wrap">
                <span className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">Origin</span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">
                  Pass-Through Hop
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                <span className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">Destination</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-semibold">Regulatory Reference:</span> Article 15 DASP Law (FATF Recommendation 16 - Intermediary structuring indicators).
          </div>
        </div>

        {/* Rule 2: Dormant Assets Rule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Rule 02 · Inactivity
            </span>
            <span className="text-[11px] font-mono text-slate-400">Score Impact: +35</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Dormant Assets Awakening</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Identifies cryptographic assets that have remained completely unmoved on-chain for <strong className="text-white">&gt;365 days</strong> before sudden transfer.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Threshold Trigger:</span>
              <span className="font-mono text-amber-400 font-bold">&gt; 365 Days</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full w-1/2" title="Active (0-365 days)" />
              <div className="bg-amber-500 h-full w-1/2" title="Trigger (>365 days)" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Active Cycle</span>
              <span>Dormant Awakening</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-semibold">CipherTrace Correlation:</span> Sudden movement of cold UTXOs often correlates with compromised private keys, dark web escrow unfreezing, or ransomware liquidations.
          </div>
        </div>

        {/* Rule 3: Stagnant Corporate Wallets Rule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Rule 03 · Velocity Spike
            </span>
            <span className="text-[11px] font-mono text-slate-400">Score Impact: +50</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Stagnant Corporate Wallets</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Triggers if a corporate entity wallet with a historical monthly baseline of zero activity suddenly receives a large volume spike.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Historical Monthly Volume:</span>
              <span className="font-mono text-rose-400 font-bold">$0.00 / month</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Sudden Inflow:</span>
              <span className="font-mono text-white font-bold">&gt; $5,000.00</span>
            </div>
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[11px] text-rose-300">
              High-Risk Shell Entity Indicator: Shell corporate structure holding no payroll or vendor payment history.
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-semibold">DeFi Smart Treasury:</span> Cross-checks corporate signatory multi-sig contracts against CNAD commercial register filings.
          </div>
        </div>
      </div>

      {/* Decision Thresholds Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">
          Score Thresholds &amp; Statutory Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Risk Score &le; 40 · APPROVE (Dispersal)</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Low-to-moderate risk profile. Funds are authorized for atomic dispersal via CeFi retail clearing or DeFi corporate treasury smart contracts.
            </p>
            <div className="text-xs font-mono text-emerald-300 mt-2">
              Fee: 0.5% Base + Risk Premium (+0.1% per 10 score points)
            </div>
          </div>

          <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertOctagon className="w-4 h-4" />
              <span>Risk Score &gt; 40 · REFUND (Atomic Penalty)</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Inadmissible compliance risk. Avoids asset retention liabilities by executing an immediate atomic refund to origin, penalizing sender to monetize risk &amp; cover CipherTrace API costs.
            </p>
            <div className="text-xs font-mono text-rose-300 mt-2">
              Fee: 2.0% Base + Volatility Buffer (+1.5% volatile) + Gas (Capped at 5.0% max)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

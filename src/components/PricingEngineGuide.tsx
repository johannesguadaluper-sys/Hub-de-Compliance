import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

export const PricingEngineGuide: React.FC = () => {
  const [testScore, setTestScore] = useState<number>(25);
  const [testAmount, setTestAmount] = useState<number>(10000);
  const [testAssetType, setTestAssetType] = useState<'stablecoin' | 'volatile'>('volatile');

  // Compute pricing simulation
  const isApproved = testScore <= 40;
  let appliedRate = 0;
  let hubFee = 0;
  let netRefund = 0;
  let netDispersed = 0;
  let gasCost = 0;
  let isCapped = false;
  let maxCap = testAmount * 0.05;

  if (isApproved) {
    const baseRate = 0.5;
    const riskPremium = (testScore / 10) * 0.1;
    appliedRate = Number((baseRate + riskPremium).toFixed(4));
    hubFee = Number(((testAmount * appliedRate) / 100).toFixed(2));
    gasCost = 0;
    netDispersed = Number((testAmount - hubFee).toFixed(2));
    netRefund = 0;
  } else {
    const baseRate = 2.0;
    const volBuffer = testAssetType === 'volatile' ? 1.5 : 0.0;
    gasCost = testAssetType === 'volatile' ? 18.5 : 4.5;
    const rawPenalty = ((testAmount * (baseRate + volBuffer)) / 100) + gasCost;
    if (rawPenalty > maxCap) {
      isCapped = true;
      hubFee = Number(maxCap.toFixed(2));
    } else {
      isCapped = false;
      hubFee = Number(rawPenalty.toFixed(2));
    }
    appliedRate = Number(((hubFee / testAmount) * 100).toFixed(4));
    netRefund = Number(Math.max(0, testAmount - hubFee).toFixed(2));
    netDispersed = 0;
  }

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Autonomous Pricing Engine &amp; Fee Schedule
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          The engine operates autonomously to monetize financial risk, slippage volatility, network overhead, and CipherTrace verification costs without legal asset custody liabilities.
        </p>
      </div>

      {/* Two Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Successful Dispersal Fee */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Pillar 1 · Approved Dispersal
            </span>
            <span className="text-xs font-mono text-emerald-300">Risk Score &le; 40</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Successful Dispersal Fee</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Standard execution fee deducted from dispersed funds to cover treasury operational margin and risk clearance.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs space-y-2">
            <div className="text-emerald-400 font-semibold">
              Formula: Base Fee (0.5%) + Risk Premium
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              &bull; <strong className="text-white">Base Fee:</strong> 0.50% flat on all cleared volume.
              <br />
              &bull; <strong className="text-white">Risk Premium:</strong> Add +0.10% for every 10 points of Risk Score above 0.
            </div>
          </div>

          <div className="text-xs font-mono text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span>Score 0 (Pristine):</span>
              <span className="text-emerald-400">0.50% fee</span>
            </div>
            <div className="flex justify-between">
              <span>Score 20 (Nominal):</span>
              <span className="text-emerald-400">0.70% fee</span>
            </div>
            <div className="flex justify-between">
              <span>Score 40 (Threshold):</span>
              <span className="text-emerald-400">0.90% fee</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Return Fee / Refund Penalty */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Pillar 2 · Non-Custodial Atomic Refund
            </span>
            <span className="text-xs font-mono text-rose-300">Risk Score &gt; 40</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Return Fee &amp; Refund Penalty</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Atomic refund executes back to the sender. The sender is penalized to monetize risk and reimburse CipherTrace API query overhead.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs space-y-2">
            <div className="text-rose-400 font-semibold">
              Formula: Base Rejection (2.0%) + Volatility Buffer + Gas Cost
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              &bull; <strong className="text-white">Base Rejection Fee:</strong> 2.0% flat penalty.
              <br />
              &bull; <strong className="text-white">Volatility Buffer:</strong> +1.5% for volatile assets (BTC, ETH, SOL) / 0% for stablecoins (USDT, USDC).
              <br />
              &bull; <strong className="text-white">Estimated Gas:</strong> Deducts actual atomic refund gas overhead.
              <br />
              &bull; <strong className="text-amber-400">Maximum Cap:</strong> Total penalty strictly capped at 5.0% volume.
            </div>
          </div>

          <div className="text-xs font-mono text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span>Stablecoin (USDT/USDC):</span>
              <span className="text-rose-300">2.0% + Gas ($4.50) [Max 5%]</span>
            </div>
            <div className="flex justify-between">
              <span>Volatile (BTC/ETH/SOL):</span>
              <span className="text-rose-300">3.5% + Gas ($18.50) [Max 5%]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Fee Matrix Calculator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Interactive Fee Curve Simulator
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Simulated Risk Score</span>
                <span className="font-mono font-bold text-white">{testScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={testScore}
                onChange={(e) => setTestScore(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span className="text-emerald-400">&le; 40 Approve</span>
                <span className="text-rose-400">&gt; 40 Refund Penalty</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Transaction Amount (USD)</span>
                <span className="font-mono font-bold text-white">${testAmount.toLocaleString()}</span>
              </div>
              <input
                type="number"
                step="500"
                min="100"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1.5">Asset Volatility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTestAssetType('stablecoin')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border cursor-pointer ${
                    testAssetType === 'stablecoin'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Stablecoin (0%)
                </button>
                <button
                  type="button"
                  onClick={() => setTestAssetType('volatile')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border cursor-pointer ${
                    testAssetType === 'volatile'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Volatile (+1.5%)
                </button>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="md:col-span-2 bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                Calculated Outcome
              </span>
              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isApproved ? 'ACTION: APPROVE' : 'ACTION: REFUND'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Applied Rate</div>
                <div className="text-base font-bold font-mono text-amber-400 mt-1">
                  {appliedRate.toFixed(2)}%
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Hub Fee / Penalty</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  ${hubFee.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">
                  {isApproved ? 'Net Dispersed' : 'Net Refunded'}
                </div>
                <div className="text-base font-bold font-mono text-sky-400 mt-1">
                  ${(isApproved ? netDispersed : netRefund).toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Max Cap Limit (5%)</div>
                <div className="text-base font-bold font-mono text-slate-300 mt-1">
                  ${maxCap.toFixed(2)}
                </div>
              </div>
            </div>

            {isCapped && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  The 5.0% maximum statutory volume cap was triggered! Raw penalty exceeded ${maxCap.toFixed(2)}, fee was clamped.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

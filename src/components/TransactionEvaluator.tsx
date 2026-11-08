import React, { useState } from 'react';
import {
  TransactionInput,
  ComplianceEvaluationResult,
} from '../engine/types';
import {
  evaluateTransaction,
  formatStrictOutputJSON,
  SCENARIO_PRESETS,
} from '../engine/complianceEngine';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Code2,
  Sliders,
  Flame,
  Zap,
} from 'lucide-react';

interface TransactionEvaluatorProps {
  onEvaluationComplete?: (result: ComplianceEvaluationResult) => void;
}

export const TransactionEvaluator: React.FC<TransactionEvaluatorProps> = ({
  onEvaluationComplete,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('smurfing-retail-pass-through');
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form');
  const [copied, setCopied] = useState(false);

  // Form State
  const [input, setInput] = useState<TransactionInput>({
    wallet_type: 'retail',
    amount_usd: 9800.0,
    days_inactive: 14,
    nodes_in_path: 3,
    historical_monthly_avg_usd: 650.0,
    asset_type: 'volatile',
    asset_symbol: 'BTC',
    wallet_address: 'bc1q9v8u0q3...m4k7',
    destination_address: 'bc1q88a91c0...p29z',
  });

  // JSON Raw Input State
  const [rawJsonText, setRawJsonText] = useState<string>(() =>
    JSON.stringify(
      {
        wallet_type: 'retail',
        amount_usd: 9800.0,
        days_inactive: 14,
        nodes_in_path: 3,
        historical_monthly_avg_usd: 650.0,
        asset_type: 'volatile',
      },
      null,
      2
    )
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Autonomous Evaluation execution
  const currentResult: ComplianceEvaluationResult = React.useMemo(() => {
    return evaluateTransaction(input);
  }, [input]);

  // Load preset handler
  const handleSelectPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setInput(preset.input);
    setRawJsonText(
      JSON.stringify(
        {
          wallet_type: preset.input.wallet_type,
          amount_usd: preset.input.amount_usd,
          days_inactive: preset.input.days_inactive,
          nodes_in_path: preset.input.nodes_in_path,
          historical_monthly_avg_usd: preset.input.historical_monthly_avg_usd,
          asset_type: preset.input.asset_type,
        },
        null,
        2
      )
    );
    setJsonError(null);
    if (onEvaluationComplete) {
      onEvaluationComplete(evaluateTransaction(preset.input));
    }
  };

  // Raw JSON update handler
  const handleRawJsonChange = (text: string) => {
    setRawJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (
        typeof parsed.amount_usd !== 'number' ||
        !parsed.wallet_type ||
        typeof parsed.days_inactive !== 'number' ||
        typeof parsed.nodes_in_path !== 'number' ||
        typeof parsed.historical_monthly_avg_usd !== 'number' ||
        !parsed.asset_type
      ) {
        setJsonError(
          'Missing or invalid required keys: wallet_type, amount_usd, days_inactive, nodes_in_path, historical_monthly_avg_usd, asset_type'
        );
        return;
      }
      setJsonError(null);
      setInput((prev) => ({
        ...prev,
        wallet_type: parsed.wallet_type,
        amount_usd: parsed.amount_usd,
        days_inactive: parsed.days_inactive,
        nodes_in_path: parsed.nodes_in_path,
        historical_monthly_avg_usd: parsed.historical_monthly_avg_usd,
        asset_type: parsed.asset_type,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid JSON syntax';
      setJsonError(message);
    }
  };

  const strictJsonOutput = React.useMemo(() => {
    return formatStrictOutputJSON(currentResult);
  }, [currentResult]);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(strictJsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Preset Scenarios Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Heuristic AML Simulation Presets
          </label>
          <span className="text-xs text-slate-500">
            Select a verified scenario or customize input parameters below
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const categoryColors: Record<string, string> = {
              Clean: 'text-emerald-400',
              Warning: 'text-amber-400',
              'High Risk': 'text-rose-400',
              'Critical Laundering': 'text-red-500',
            };

            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500/80 bg-slate-900 shadow-sm shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${categoryColors[preset.category] || 'text-slate-400'}`}>
                    {preset.category}
                  </div>
                  <div className="text-xs font-medium text-slate-200 mt-0.5 line-clamp-2">
                    {preset.name}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-2">
                  ${preset.input.amount_usd.toLocaleString()} · {preset.input.asset_type}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Input Parameters (Left) vs Autonomous Financial Intelligence Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Transaction Input (Form or Raw JSON) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
            {/* Input Header & Switcher */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Inbound Transaction Metadata</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Feed telemetry into the autonomous AML/CFT heuristics
                </p>
              </div>

              {/* Segmented Mode Control */}
              <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setInputMode('form')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    inputMode === 'form'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Controls</span>
                </button>
                <button
                  onClick={() => setInputMode('json')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    inputMode === 'json'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Raw JSON</span>
                </button>
              </div>
            </div>

            {inputMode === 'form' ? (
              <div className="space-y-4">
                {/* Wallet Type (CeFi Retail vs DeFi Corporate) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Wallet Type &amp; Operating Rail
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {input.wallet_type === 'corporate' ? 'DeFi Smart Treasury' : 'CeFi Retail Wallet'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInput({ ...input, wallet_type: 'retail' })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        input.wallet_type === 'retail'
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Retail Wallet (CeFi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput({ ...input, wallet_type: 'corporate' })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        input.wallet_type === 'corporate'
                          ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Corporate Treasury (DeFi)
                    </button>
                  </div>
                </div>

                {/* Inbound Amount USD */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Inbound Amount (USD)
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => setInput({ ...input, amount_usd: 2500 })}
                        className="hover:text-emerald-400 underline cursor-pointer"
                      >
                        $2.5k
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setInput({ ...input, amount_usd: 9800 })}
                        className="hover:text-emerald-400 underline cursor-pointer"
                      >
                        $9.8k
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setInput({ ...input, amount_usd: 50000 })}
                        className="hover:text-emerald-400 underline cursor-pointer"
                      >
                        $50k
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setInput({ ...input, amount_usd: 250000 })}
                        className="hover:text-emerald-400 underline cursor-pointer"
                      >
                        $250k
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="100"
                      min="1"
                      value={input.amount_usd}
                      onChange={(e) =>
                        setInput({ ...input, amount_usd: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-7 pr-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Days Inactive on-chain */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Days Inactive On-Chain
                    </label>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        input.days_inactive > 365 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {input.days_inactive} days {input.days_inactive > 365 && '(> 365d Trigger)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="730"
                    step="5"
                    value={input.days_inactive}
                    onChange={(e) =>
                      setInput({ ...input, days_inactive: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>0d (Active)</span>
                    <span className="text-amber-500">365d Dormant Threshold</span>
                    <span>730d (2 yrs)</span>
                  </div>
                </div>

                {/* Nodes in Path (Smurfing Heuristic) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      On-Chain Routing Path Nodes
                    </label>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        input.nodes_in_path >= 3 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {input.nodes_in_path} Nodes{' '}
                      {input.nodes_in_path >= 3 ? '(Pass-Through Structuring)' : '(Direct Transfer)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((nodeCount) => (
                      <button
                        key={nodeCount}
                        type="button"
                        onClick={() => setInput({ ...input, nodes_in_path: nodeCount })}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          input.nodes_in_path === nodeCount
                            ? nodeCount >= 3
                              ? 'border-rose-500/60 bg-rose-500/10 text-rose-300'
                              : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {nodeCount === 2
                          ? '2 Nodes (Direct)'
                          : nodeCount === 3
                          ? '3 Nodes (1-Hop)'
                          : '4+ Nodes (Multi-Hop)'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard flow is 2 nodes (Origin → Destination). 3+ nodes deviates through pass-through wallets.
                  </p>
                </div>

                {/* Historical Monthly Avg USD */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Historical Monthly Volume Avg (USD)
                    </label>
                    <span
                      className={`text-xs font-mono ${
                        input.historical_monthly_avg_usd === 0 && input.wallet_type === 'corporate'
                          ? 'text-rose-400 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {input.historical_monthly_avg_usd === 0
                        ? '$0.00 (Zero History)'
                        : `$${input.historical_monthly_avg_usd.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={input.historical_monthly_avg_usd}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          historical_monthly_avg_usd: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-7 pr-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Asset Type (Stablecoin vs Volatile) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Asset Volatility Classification
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {input.asset_type === 'volatile'
                        ? 'Volatility Buffer: +1.5%'
                        : 'Volatility Buffer: 0.0%'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setInput({ ...input, asset_type: 'stablecoin', asset_symbol: 'USDC' })
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        input.asset_type === 'stablecoin'
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Stablecoin (USDT / USDC)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInput({ ...input, asset_type: 'volatile', asset_symbol: 'BTC' })
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        input.asset_type === 'volatile'
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Volatile (BTC / ETH / SOL)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Raw JSON Editor */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Input JSON Schema (Real-time parser)</span>
                  <button
                    onClick={() => {
                      try {
                        const formatted = JSON.stringify(JSON.parse(rawJsonText), null, 2);
                        setRawJsonText(formatted);
                      } catch {
                        // ignore formatting if invalid
                      }
                    }}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Format JSON
                  </button>
                </div>
                <textarea
                  value={rawJsonText}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  rows={13}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                  spellCheck={false}
                />
                {jsonError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{jsonError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Autonomous Financial Intelligence & Decision Output */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Action Verdict & Risk Gauge Card */}
          <div
            className={`border rounded-xl p-6 transition-all ${
              currentResult.action === 'APPROVE'
                ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-950/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    currentResult.action === 'APPROVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {currentResult.action === 'APPROVE' ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Autonomous Decision
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {currentResult.transaction_id.slice(0, 8)}...
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {currentResult.action === 'APPROVE'
                      ? 'APPROVE — EXECUTE DISPERSAL'
                      : 'REFUND — ATOMIC REJECTION PENALTY'}
                  </h2>
                </div>
              </div>

              {/* Score Dial & Alert Level */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    CipherTrace Alert
                  </div>
                  <div
                    className={`text-sm font-bold font-mono ${
                      currentResult.risk_assessment.ciphertrace_alert_level === 'HIGH'
                        ? 'text-rose-400'
                        : currentResult.risk_assessment.ciphertrace_alert_level === 'MEDIUM'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {currentResult.risk_assessment.ciphertrace_alert_level}
                  </div>
                </div>

                <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Risk</span>
                  <span
                    className={`text-xl font-bold font-mono tabular-nums leading-none mt-0.5 ${
                      currentResult.risk_assessment.score <= 40
                        ? 'text-emerald-400'
                        : currentResult.risk_assessment.score <= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {currentResult.risk_assessment.score}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">/ 100</span>
                </div>
              </div>
            </div>

            {/* Heuristic Trigger Indicators */}
            <div className="py-4 border-b border-slate-800/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Heuristic AML Rules Evaluation
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Smurfing Rule Card */}
                <div
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    currentResult.risk_assessment.triggers_activated.includes('SMURFING')
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">1. Smurfing Rule</span>
                    {currentResult.risk_assessment.triggers_activated.includes('SMURFING') ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    {currentResult.risk_assessment.triggers_activated.includes('SMURFING')
                      ? `TRIGGERED: ${input.nodes_in_path}-node pass-through detected`
                      : 'NORMAL: 2-node direct path'}
                  </div>
                </div>

                {/* Dormant Assets Rule Card */}
                <div
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    currentResult.risk_assessment.triggers_activated.includes('DORMANT_ASSET')
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">2. Dormant Assets</span>
                    {currentResult.risk_assessment.triggers_activated.includes('DORMANT_ASSET') ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    {currentResult.risk_assessment.triggers_activated.includes('DORMANT_ASSET')
                      ? `TRIGGERED: Unmoved for ${input.days_inactive}d (>365d)`
                      : `NORMAL: Inactive ${input.days_inactive}d (<=365d)`}
                  </div>
                </div>

                {/* Stagnant Corporate Rule Card */}
                <div
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    currentResult.risk_assessment.triggers_activated.includes('STAGNANT_CORPORATE')
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">3. Stagnant Corporate</span>
                    {currentResult.risk_assessment.triggers_activated.includes('STAGNANT_CORPORATE') ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    {currentResult.risk_assessment.triggers_activated.includes('STAGNANT_CORPORATE')
                      ? `TRIGGERED: Zero history spike on corporate wallet`
                      : input.wallet_type === 'corporate'
                      ? 'ACTIVE: Corporate activity on file'
                      : 'N/A: Retail entity'}
                  </div>
                </div>
              </div>
            </div>

            {/* Financials & Dynamic Pricing Breakdown */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Autonomous Pricing Engine Execution
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {currentResult.action === 'APPROVE'
                    ? 'Dispersal Fee Formula: Base (0.5%) + Risk Premium'
                    : 'Refund Penalty Formula: Base (2.0%) + Buffer + Gas [Max 5%]'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400">Inbound Volume</div>
                  <div className="text-sm font-bold font-mono text-white mt-1 tabular-nums">
                    ${currentResult.financials.inbound_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400">Applied Rate</div>
                  <div className="text-sm font-bold font-mono text-amber-400 mt-1 tabular-nums">
                    {currentResult.financials.applied_rate_percentage.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentResult.action === 'APPROVE'
                      ? `0.5% + ${(currentResult.risk_assessment.score / 10 * 0.1).toFixed(2)}%`
                      : currentResult.metadata?.pricing_breakdown.is_capped
                      ? 'Capped at 5.0% max'
                      : `2.0% + ${input.asset_type === 'volatile' ? '1.5%' : '0%'} + Gas`}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400">
                    {currentResult.action === 'APPROVE' ? 'Hub Dispersal Fee' : 'Hub Penalty Deducted'}
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                    ${currentResult.financials.hub_fee_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Monetized Risk &amp; Fee
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400">
                    {currentResult.action === 'APPROVE' ? 'Dispersed Proceeds' : 'Net Refund to Sender'}
                  </div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-1 tabular-nums">
                    ${(currentResult.action === 'APPROVE'
                      ? currentResult.financials.inbound_amount_usd - currentResult.financials.hub_fee_usd
                      : currentResult.financials.net_refund_amount_usd
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentResult.action === 'APPROVE' ? 'Dispersed to Dest' : 'Atomic Smart Return'}
                  </div>
                </div>
              </div>

              {/* Gas Overhead & Cap Warning */}
              {currentResult.action === 'REFUND' && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Estimated Gas Deduction:</span>
                    <span className="text-white">${currentResult.financials.estimated_gas_deduction_usd.toFixed(2)}</span>
                  </div>
                  {currentResult.metadata?.pricing_breakdown.is_capped ? (
                    <div className="text-amber-400 font-semibold">
                      Notice: 5.0% Statutory Max Volume Cap Applied
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      Within 5.0% Volume Cap Limit (${currentResult.metadata?.pricing_breakdown.max_cap_usd.toFixed(2)} max)
                    </div>
                  )}
                </div>
              )}

              {/* Instant SPEI Dispersal Trigger Bar */}
              {currentResult.action === 'APPROVE' && onEvaluationComplete && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/30 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white">Transacción Aprobada por Reglas AML</span>
                      <p className="text-[11px] text-emerald-300/80">Lista para dispersión a la red SPEI Banxico / STP con acreditación en bóveda.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEvaluationComplete(currentResult)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-xs shrink-0 shadow-sm shadow-emerald-950/50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dispersar a SPEI Inmediatamente</span>
                  </button>
                </div>
              )}
            </div>

            {/* Compliance Actions (SAR and Blacklist) */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Passive SAR Filing:</span>
                  {currentResult.compliance_action.generate_pasive_sar_report ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      YES (Generated)
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      NO (Nominal)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Origin Wallet Blacklist:</span>
                  {currentResult.compliance_action.blacklist_origin_wallet ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      YES (Blacklisted)
                    </span>
                  ) : (
                    <span className="text-slate-400">NO</span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Operating under CNAD DASP License · CipherTrace Grounded
              </div>
            </div>
          </div>

          {/* Strict JSON Output Container (Mandatory Specification) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Mandatory Output Schema (Strict JSON Validated)
                </span>
              </div>
              <button
                onClick={handleCopyJSON}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md text-xs font-mono text-slate-200 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed select-all">
              {strictJsonOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { TransactionInput, ComplianceEvaluationResult } from '../engine/types';
import { evaluateTransaction, formatStrictOutputJSON } from '../engine/complianceEngine';
import { Play, Download, Copy, Check, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const BatchAuditor: React.FC = () => {
  const defaultBatch: TransactionInput[] = [
    {
      wallet_type: 'retail',
      amount_usd: 9800.0,
      days_inactive: 14,
      nodes_in_path: 3,
      historical_monthly_avg_usd: 650.0,
      asset_type: 'volatile',
    },
    {
      wallet_type: 'retail',
      amount_usd: 85000.0,
      days_inactive: 480,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 5000.0,
      asset_type: 'volatile',
    },
    {
      wallet_type: 'corporate',
      amount_usd: 250000.0,
      days_inactive: 60,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 0.0,
      asset_type: 'stablecoin',
    },
    {
      wallet_type: 'retail',
      amount_usd: 2400.0,
      days_inactive: 5,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 2500.0,
      asset_type: 'stablecoin',
    },
    {
      wallet_type: 'corporate',
      amount_usd: 75000.0,
      days_inactive: 12,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 90000.0,
      asset_type: 'stablecoin',
    },
  ];

  const [jsonBatchText, setJsonBatchText] = useState<string>(() =>
    JSON.stringify(defaultBatch, null, 2)
  );
  const [results, setResults] = useState<ComplianceEvaluationResult[]>(() =>
    defaultBatch.map(evaluateTransaction)
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunBatch = () => {
    try {
      const parsed = JSON.parse(jsonBatchText);
      if (!Array.isArray(parsed)) {
        setError('Batch input must be a JSON array of transaction objects');
        return;
      }
      const evaluated = parsed.map((item, idx) => {
        if (!item.wallet_type || typeof item.amount_usd !== 'number') {
          throw new Error(`Item at index ${idx} is missing required fields`);
        }
        return evaluateTransaction(item);
      });
      setResults(evaluated);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON array';
      setError(msg);
    }
  };

  const handleCopyResults = () => {
    const formatted = results.map((r) => JSON.parse(formatStrictOutputJSON(r)));
    navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const formatted = results.map((r) => JSON.parse(formatStrictOutputJSON(r)));
    const blob = new Blob([JSON.stringify(formatted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dasp_batch_evaluation_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Aggregated analytics
  const totalVolume = results.reduce((acc, r) => acc + r.financials.inbound_amount_usd, 0);
  const totalHubFees = results.reduce((acc, r) => acc + r.financials.hub_fee_usd, 0);
  const approvedCount = results.filter((r) => r.action === 'APPROVE').length;
  const refundedCount = results.filter((r) => r.action === 'REFUND').length;
  const sarReportsCount = results.filter((r) => r.compliance_action.generate_pasive_sar_report).length;

  return (
    <div className="space-y-8">
      {/* Title & Stats */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Batch Transaction AML Auditor &amp; Dispersal Pipeline
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Simulate high-throughput ingestion from payment gateways, OTC desks, or corporate treasury multi-sigs. Audits each transaction against the 3 heuristic rules and calculates individual fees.
        </p>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Total Audited Volume</div>
          <div className="text-lg font-bold font-mono text-white mt-1 tabular-nums">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{results.length} Transactions</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Total Fees Monetized</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            ${totalHubFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Dispersal &amp; Refund Penalties</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Approved Volume</div>
          <div className="text-lg font-bold font-mono text-sky-400 mt-1 tabular-nums">
            {approvedCount} / {results.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {results.length > 0 ? ((approvedCount / results.length) * 100).toFixed(0) : 0}% Cleared
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Refunded / Penalized</div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {refundedCount} / {results.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Atomic Smart Returns</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Passive SAR Filings</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {sarReportsCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">CNAD Sandbox Flagged</div>
        </div>
      </div>

      {/* Editor & Execution Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Batch Ingestion JSON Array
            </span>
            <button
              onClick={handleRunBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Batch Audit</span>
            </button>
          </div>

          <textarea
            value={jsonBatchText}
            onChange={(e) => setJsonBatchText(e.target.value)}
            rows={14}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            spellCheck={false}
          />

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Batch Evaluation Output ({results.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyResults}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Tx ID</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Score</th>
                  <th className="py-2.5 px-3 font-semibold">Volume</th>
                  <th className="py-2.5 px-3 font-semibold">Rate</th>
                  <th className="py-2.5 px-3 font-semibold">Hub Fee</th>
                  <th className="py-2.5 px-3 font-semibold">Triggers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {results.map((res) => (
                  <tr key={res.transaction_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {res.transaction_id.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          res.action === 'APPROVE' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {res.action === 'APPROVE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {res.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">
                      <span
                        className={
                          res.risk_assessment.score <= 40
                            ? 'text-emerald-400'
                            : res.risk_assessment.score <= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {res.risk_assessment.score}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 tabular-nums">
                      ${res.financials.inbound_amount_usd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300 tabular-nums">
                      {res.financials.applied_rate_percentage.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold tabular-nums">
                      ${res.financials.hub_fee_usd.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      {res.risk_assessment.triggers_activated.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {res.risk_assessment.triggers_activated.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">None (Clean)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

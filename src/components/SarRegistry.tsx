import React, { useState } from 'react';
import { ComplianceEvaluationResult } from '../engine/types';
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Filter,
} from 'lucide-react';

interface SarRegistryProps {
  history: ComplianceEvaluationResult[];
}

export const SarRegistry: React.FC<SarRegistryProps> = ({ history }) => {
  const [filterAction, setFilterAction] = useState<'ALL' | 'APPROVE' | 'REFUND'>('ALL');
  const [filterTrigger, setFilterTrigger] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<ComplianceEvaluationResult | null>(null);

  const filteredHistory = history.filter((item) => {
    if (filterAction !== 'ALL' && item.action !== filterAction) return false;
    if (filterTrigger !== 'ALL') {
      if (!item.risk_assessment.triggers_activated.includes(filterTrigger as any)) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.transaction_id.toLowerCase().includes(q);
      const matchAlert = item.risk_assessment.ciphertrace_alert_level.toLowerCase().includes(q);
      const matchTriggers = item.risk_assessment.triggers_activated.some((t) =>
        t.toLowerCase().includes(q)
      );
      if (!matchId && !matchAlert && !matchTriggers) return false;
    }
    return true;
  });

  const sarCount = history.filter((h) => h.compliance_action.generate_pasive_sar_report).length;
  const blacklistCount = history.filter((h) => h.compliance_action.blacklist_origin_wallet).length;

  const handleExportSAR = () => {
    const sarItems = history.filter((h) => h.compliance_action.generate_pasive_sar_report);
    const report = {
      regulatory_authority: 'Comisión Nacional de Activos Digitales (CNAD)',
      dasp_license: 'CNAD-DASP-SV-2024-8891',
      report_type: 'PASSIVE_SUSPICIOUS_ACTIVITY_REPORT_BATCH',
      generated_at: new Date().toISOString(),
      total_incidents: sarItems.length,
      incidents: sarItems,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CNAD_DASP_Passive_SAR_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Title & Stats */}
      <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            SAR Compliance Registry &amp; Blacklist Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Statutory records under CNAD DASP compliance guidelines. Automated Passive SAR (Suspicious Activity Report) generation and origin wallet blacklisting.
          </p>
        </div>

        <button
          onClick={handleExportSAR}
          className="flex items-center gap-2 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Download CNAD Passive SAR Dossier</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Total Evaluations</div>
          <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
            {history.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Audited records</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Passive SARs Filed</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {sarCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Under Art. 15 DASP Law</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Blacklisted Wallets</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {blacklistCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Sanctioned on-chain</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Approved Volume</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {history.filter((h) => h.action === 'APPROVE').length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Cleared for Dispersal</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by transaction ID, trigger, or alert level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          {/* Action filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['ALL', 'APPROVE', 'REFUND'] as const).map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterAction === act
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {act === 'ALL' ? 'All Actions' : act}
              </button>
            ))}
          </div>

          {/* Trigger filter */}
          <select
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Heuristics</option>
            <option value="SMURFING">Smurfing Triggered</option>
            <option value="DORMANT_ASSET">Dormant Asset Triggered</option>
            <option value="STAGNANT_CORPORATE">Stagnant Corporate Triggered</option>
          </select>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Transaction ID</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Risk Score</th>
                <th className="py-3 px-4 font-semibold">CipherTrace</th>
                <th className="py-3 px-4 font-semibold">Inbound (USD)</th>
                <th className="py-3 px-4 font-semibold">Hub Fee (USD)</th>
                <th className="py-3 px-4 font-semibold">Passive SAR</th>
                <th className="py-3 px-4 font-semibold">Blacklisted</th>
                <th className="py-3 px-4 font-semibold">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.transaction_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {item.transaction_id.slice(0, 10)}...
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          item.action === 'APPROVE' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.action === 'APPROVE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {item.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      <span
                        className={
                          item.risk_assessment.score <= 40
                            ? 'text-emerald-400'
                            : item.risk_assessment.score <= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {item.risk_assessment.score} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={
                          item.risk_assessment.ciphertrace_alert_level === 'HIGH'
                            ? 'text-rose-400'
                            : item.risk_assessment.ciphertrace_alert_level === 'MEDIUM'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {item.risk_assessment.ciphertrace_alert_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 tabular-nums">
                      ${item.financials.inbound_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold tabular-nums">
                      ${item.financials.hub_fee_usd.toFixed(2)} ({item.financials.applied_rate_percentage.toFixed(2)}%)
                    </td>
                    <td className="py-3 px-4">
                      {item.compliance_action.generate_pasive_sar_report ? (
                        <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          FILED
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.compliance_action.blacklist_origin_wallet ? (
                        <span className="text-rose-400 font-semibold">YES</span>
                      ) : (
                        <span className="text-slate-500">NO</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTx(item)}
                        className="text-xs font-sans text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Compliance Dossier</h3>
                <span className="text-xs font-mono text-slate-400">
                  ID: {selectedTx.transaction_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span
                    className={
                      selectedTx.action === 'APPROVE' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                    }
                  >
                    {selectedTx.action}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Score:</span>
                  <span className="text-white font-bold">{selectedTx.risk_assessment.score} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CipherTrace Level:</span>
                  <span className="text-amber-400 font-bold">
                    {selectedTx.risk_assessment.ciphertrace_alert_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Triggers:</span>
                  <span className="text-rose-300">
                    {selectedTx.risk_assessment.triggers_activated.join(', ') || 'None'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Inbound Amount:</span>
                  <span className="text-white font-bold">
                    ${selectedTx.financials.inbound_amount_usd.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Applied Rate:</span>
                  <span className="text-amber-400">
                    {selectedTx.financials.applied_rate_percentage.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hub Fee / Penalty:</span>
                  <span className="text-emerald-400 font-bold">
                    ${selectedTx.financials.hub_fee_usd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Refund to Sender:</span>
                  <span className="text-sky-400">
                    ${selectedTx.financials.net_refund_amount_usd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gas Overhead:</span>
                  <span className="text-slate-400">
                    ${selectedTx.financials.estimated_gas_deduction_usd.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Generate Passive SAR:</span>
                  <span className={selectedTx.compliance_action.generate_pasive_sar_report ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                    {selectedTx.compliance_action.generate_pasive_sar_report ? 'YES (Filed)' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blacklist Origin Wallet:</span>
                  <span className={selectedTx.compliance_action.blacklist_origin_wallet ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                    {selectedTx.compliance_action.blacklist_origin_wallet ? 'YES (Sanctioned)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

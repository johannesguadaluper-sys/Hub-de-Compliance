import React from 'react';
import { ShieldCheck, Download, RefreshCw, HardDrive, Send, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
  onExportLedger: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  onExportLedger,
  historyCount,
}) => {
  const tabs = [
    { id: 'evaluator', label: 'Compliance Engine' },
    { id: 'vault', label: 'Bóveda Vault' },
    { id: 'spei', label: 'Dispersador SPEI' },
    { id: 'bulk', label: 'Lote Masivo (4-Eyes)' },
    { id: 'hsm', label: 'Servidor HSM' },
    { id: 'antihooking', label: 'Webhook Turbo' },
    { id: 'trends', label: 'Compliance Trends' },
    { id: 'fiscal', label: 'Fiscalización & SAT' },
    { id: 'audit', label: 'Auditoría Mainnet' },
    { id: 'heuristics', label: 'AML Heuristics' },
    { id: 'pricing', label: 'Pricing Formula' },
    { id: 'batch', label: 'Batch Auditor' },
    { id: 'sar', label: `SAR Ledger (${historyCount})` },
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      {/* Zone 1: Single Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          ARCADIA · DASP &amp; SPEI HUB
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden lg:flex items-center gap-4 overflow-x-auto max-w-4xl text-xs font-medium text-slate-300 py-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === tab.id
                ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Zone 3: Primary Action Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile dropdown selector if view is compact */}
        <div className="xl:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onReset}
          title="Reset to default transaction"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={onExportLedger}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-emerald-950/50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log</span>
        </button>
      </div>
    </header>
  );
};

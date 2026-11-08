import React from 'react';
import { ShieldCheck, Activity, Layers, Server } from 'lucide-react';

export const LicenseBanner: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2.5 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-200 font-medium">CNAD DASP License:</span>
          <span className="font-mono text-emerald-300">CNAD-DASP-SV-2024-8891</span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-400 hidden sm:inline">Republic of El Salvador</span>
        </div>

        <div className="flex items-center gap-5 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>CipherTrace AML Gateway:</span>
            <span className="text-slate-200 font-mono">ONLINE</span>
          </div>

          <div className="flex items-center gap-1.5 hidden md:flex">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>Dual Rails:</span>
            <span className="text-slate-200">CeFi (Retail) &amp; DeFi (Corporate)</span>
          </div>

          <div className="flex items-center gap-1.5 hidden lg:flex">
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>Policy:</span>
            <span className="text-slate-200">Autonomous Heuristic v3.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};

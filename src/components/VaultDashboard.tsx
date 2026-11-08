import React, { useState } from 'react';
import { VaultState } from '../engine/speiTypes';
import {
  Coins,
  ArrowUpRight,
  RefreshCw,
  HardDrive,
  Lock,
  Play,
  Pause,
  AlertCircle,
  Building,
  Zap,
} from 'lucide-react';

interface VaultDashboardProps {
  vault: VaultState;
  onRefresh: () => void;
  onToggleAuto: (active: boolean) => void;
  onResetVault: () => void;
}

export const VaultDashboard: React.FC<VaultDashboardProps> = ({
  vault,
  onRefresh,
  onToggleAuto,
  onResetVault,
}) => {
  const [resetting, setResetting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const handleTriggerAccelerated = async () => {
    setTriggering(true);
    try {
      await fetch('/api/auto-evaluator/trigger', { method: 'POST' });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  const handleReset = async () => {
    if (confirm('¿Restablecer el Vault a sus valores nominales de génesis?')) {
      setResetting(true);
      await onResetVault();
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview & Persistence Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Servidor Central · Persistencia de Datos
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <HardDrive className="w-3 h-3 text-emerald-400" />
              data/vault_state.json
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Bóveda de Resguardo de Ingresos &amp; Fondos Institucionales
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Las comisiones generadas por dispersión y las penalizaciones por retorno atómico se resguardan automáticamente en la memoria persistente del servidor. La información sobrevive a reinicios, despliegues y recargas de página.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Accelerated Trigger */}
          <button
            onClick={handleTriggerAccelerated}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer"
            title="Ejecutar una evaluación AML y dispersión SPEI acelerada inmediata"
          >
            <Zap className={`w-3.5 h-3.5 text-emerald-400 ${triggering ? 'animate-bounce' : ''}`} />
            <span>Dispersión Acelerada (1-Click)</span>
          </button>

          {/* Autonomous Ingestion Streamer Toggle */}
          <button
            onClick={() => onToggleAuto(!vault.automated_ingestion_active)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              vault.automated_ingestion_active
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shadow-sm shadow-amber-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {vault.automated_ingestion_active ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Motor AML Acelerado</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Activar Motor AML Acelerado (2s)</span>
              </>
            )}
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Sincronizar con el estado en disco"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reiniciar Bóveda</span>
          </button>
        </div>
      </div>

      {/* Autonomous Stream Indicator if active */}
      {vault.automated_ingestion_active && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Motor AML con Aceleración Activo (Ciclo 2.0s):
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Evaluando transacciones inbound y autogenerando dispersiones SPEI en tiempo real (CLABE, PAN, DIMO) con liquidación STP y folios Banxico.
              </p>
            </div>
          </div>
          <span className="font-mono text-[11px] text-amber-400/90 shrink-0">
            Última sync: {new Date(vault.last_updated).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Primary Financial Vault Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow Volume */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Volumen Total Inbound</span>
            <ArrowUpRight className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            ${vault.total_inflow_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {vault.transactions_count} transacciones auditadas
          </div>
        </div>

        {/* Accumulated Hub Fee Revenue */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-xl p-5 space-y-2 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Ingresos en Vault (Hub Fee)</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
            ${vault.accumulated_hub_fee_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-mono">
            Comisiones + Penalizaciones Monetizadas
          </div>
        </div>

        {/* Net Dispersed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fondos Dispersados (Net)</span>
            <Building className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 tabular-nums">
            ${vault.net_dispersed_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Liberaciones CeFi y DeFi
          </div>
        </div>

        {/* Net Refunded */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Retornos Atómicos (Net)</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 tabular-nums">
            ${vault.net_refunded_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Devueltos con penalización deducida
          </div>
        </div>
      </div>

      {/* Reserves Breakdown: SPEI MXN Corridor & Crypto Reserves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SPEI MXN Reserve Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Corredor Fiduciario SPEI (Banxico / STP)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Reserva de Liquidez en Pesos Mexicanos (MXN)
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              STP Clearing 646
            </span>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Balance Disponible para Dispersión:</span>
              <span className="text-xl font-bold text-emerald-400 tabular-nums">
                ${vault.spei_reserve_mxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Equivalente en USD (@ 19.85 MXN/USD):</span>
              <span className="text-slate-200">
                ${(vault.spei_reserve_mxn / 19.85).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Órdenes SPEI Procesadas:</span>
              <span className="text-slate-200">{vault.spei_dispersals_count} transferencias</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            Cuenta concentradora vinculada con STP para la liberación inmediata de pagos interbancarios en México vía la clave de rastreo idempotente.
          </div>
        </div>

        {/* Crypto Treasury Vault Reserves */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Bóveda Cripto Institucional
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Reservas Multiactivo On-Chain (CeFi / DeFi)
              </h3>
            </div>
            <span className="text-xs font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
              Multi-Sig Safe
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">USDT / USDC</div>
              <div className="text-base font-bold text-white mt-1 tabular-nums">
                ${vault.crypto_vault_usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">ERC-20 / TRC-20</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Bitcoin (BTC)</div>
              <div className="text-base font-bold text-amber-400 mt-1 tabular-nums">
                {vault.crypto_vault_btc.toFixed(4)} BTC
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                ~${(vault.crypto_vault_btc * 68000).toLocaleString()} USD
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Ethereum (ETH)</div>
              <div className="text-base font-bold text-sky-400 mt-1 tabular-nums">
                {vault.crypto_vault_eth.toFixed(2)} ETH
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                ~${(vault.crypto_vault_eth * 3500).toLocaleString()} USD
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            Las comisiones generadas por transacciones CeFi y DeFi se resguardan en estas direcciones y se reconcilian diariamente contra el balance contable del DASP en El Salvador.
          </div>
        </div>
      </div>
    </div>
  );
};

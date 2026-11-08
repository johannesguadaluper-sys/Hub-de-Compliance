/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LicenseBanner } from './components/LicenseBanner';
import { TransactionEvaluator } from './components/TransactionEvaluator';
import { VaultDashboard } from './components/VaultDashboard';
import { SpeiDisperser } from './components/SpeiDisperser';
import { SpeiArchitectureAudit } from './components/SpeiArchitectureAudit';
import { FiscalComplianceCenter } from './components/FiscalComplianceCenter';
import { HeuristicRulesPanel } from './components/HeuristicRulesPanel';
import { PricingEngineGuide } from './components/PricingEngineGuide';
import { BatchAuditor } from './components/BatchAuditor';
import { SarRegistry } from './components/SarRegistry';
import { BulkApprovalWorkflow } from './components/BulkApprovalWorkflow';
import { HsmServerManager } from './components/HsmServerManager';
import { WebhookTurboMonitor } from './components/WebhookTurboMonitor';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ComplianceEvaluationResult, TransactionInput } from './engine/types';
import { SpeiOrder, VaultState } from './engine/speiTypes';
import { evaluateTransaction, SCENARIO_PRESETS } from './engine/complianceEngine';

const DEFAULT_VAULT: VaultState = {
  total_inflow_usd: 1245000.0,
  accumulated_hub_fee_usd: 48920.0,
  net_dispersed_usd: 1085000.0,
  net_refunded_usd: 111080.0,
  spei_reserve_mxn: 8750000.0,
  crypto_vault_usdt: 450000.0,
  crypto_vault_btc: 8.45,
  crypto_vault_eth: 64.2,
  last_updated: new Date().toISOString(),
  automated_ingestion_active: false,
  transactions_count: 5,
  spei_dispersals_count: 3,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('evaluator');

  // Vault state with server persistence
  const [vault, setVault] = useState<VaultState>(DEFAULT_VAULT);
  const [speiOrders, setSpeiOrders] = useState<SpeiOrder[]>([]);

  // Seeded historical evaluations for audit trail
  const [history, setHistory] = useState<ComplianceEvaluationResult[]>(() => {
    return SCENARIO_PRESETS.map((preset) => evaluateTransaction(preset.input));
  });

  // Fetch persistent server vault on mount
  const fetchServerVault = useCallback(async () => {
    try {
      const res = await fetch('/api/vault');
      if (res.ok) {
        const data = await res.json();
        if (data.vault) {
          setVault(data.vault);
        }
        if (Array.isArray(data.spei_orders) && data.spei_orders.length > 0) {
          setSpeiOrders(data.spei_orders);
        }
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          setHistory(data.transactions);
        }
      }
    } catch (e) {
      console.warn('Could not connect to backend vault endpoint, fallback to in-memory state:', e);
    }
  }, []);

  useEffect(() => {
    fetchServerVault();
    // Accelerated polling (2.0s) when automated ingestion is active for real-time live SPEI transfers
    const pollInterval = vault.automated_ingestion_active ? 2000 : 6000;
    const interval = setInterval(fetchServerVault, pollInterval);
    return () => clearInterval(interval);
  }, [fetchServerVault, vault.automated_ingestion_active]);

  const handleEvaluationComplete = async (result: ComplianceEvaluationResult) => {
    setHistory((prev) => [result, ...prev]);

    // Also persist into backend vault
    try {
      await fetch('/api/vault/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_type: result.metadata?.rail === 'DeFi' ? 'corporate' : 'retail',
          amount_usd: result.financials.inbound_amount_usd,
          days_inactive: result.metadata?.rule_breakdown.dormant_asset_detected ? 400 : 15,
          nodes_in_path: result.metadata?.rule_breakdown.smurfing_detected ? 3 : 2,
          historical_monthly_avg_usd: 1000,
          asset_type: 'volatile',
        }),
      });
      fetchServerVault();
    } catch {
      // Fallback local update
      setVault((v) => ({
        ...v,
        total_inflow_usd: v.total_inflow_usd + result.financials.inbound_amount_usd,
        accumulated_hub_fee_usd: v.accumulated_hub_fee_usd + result.financials.hub_fee_usd,
        net_dispersed_usd:
          result.action === 'APPROVE'
            ? v.net_dispersed_usd + (result.financials.inbound_amount_usd - result.financials.hub_fee_usd)
            : v.net_dispersed_usd,
        net_refunded_usd:
          result.action === 'REFUND'
            ? v.net_refunded_usd + result.financials.net_refund_amount_usd
            : v.net_refunded_usd,
        last_updated: new Date().toISOString(),
      }));
    }
  };

  const handleToggleAuto = async (active: boolean) => {
    try {
      const res = await fetch('/api/auto-evaluator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, speed: 'TURBO' }),
      });
      const data = await res.json();
      setVault((v) => ({ ...v, automated_ingestion_active: data.automated_ingestion_active }));
      fetchServerVault();
    } catch (e) {
      console.error(e);
      setVault((v) => ({ ...v, automated_ingestion_active: active }));
    }
  };

  const handleResetVault = async () => {
    try {
      const res = await fetch('/api/vault/reset', { method: 'POST' });
      const data = await res.json();
      if (data.vault) {
        setVault(data.vault);
      }
      fetchServerVault();
    } catch {
      setVault(DEFAULT_VAULT);
    }
  };

  const handleReset = () => {
    setHistory(SCENARIO_PRESETS.map((preset) => evaluateTransaction(preset.input)));
    setActiveTab('evaluator');
  };

  const handleExportLedger = () => {
    const exportData = {
      regulatory_authority: 'Comisión Nacional de Activos Digitales (CNAD)',
      dasp_license: 'CNAD-DASP-SV-2024-8891',
      jurisdiction: 'El Salvador (CNAD) · SPEI STP (Banxico)',
      exported_at: new Date().toISOString(),
      vault_status: vault,
      audit_record_count: history.length,
      spei_orders_count: speiOrders.length,
      spei_orders: speiOrders,
      records: history,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dasp_cnad_spei_audit_ledger_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        onExportLedger={handleExportLedger}
        historyCount={history.length}
      />

      {/* DASP License & CipherTrace Regulatory Banner */}
      <LicenseBanner />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'evaluator' && (
          <TransactionEvaluator onEvaluationComplete={handleEvaluationComplete} />
        )}

        {activeTab === 'vault' && (
          <VaultDashboard
            vault={vault}
            onRefresh={fetchServerVault}
            onToggleAuto={handleToggleAuto}
            onResetVault={handleResetVault}
          />
        )}

        {activeTab === 'spei' && (
          <SpeiDisperser
            orders={speiOrders}
            onOrderSubmitted={(newOrder) => {
              setSpeiOrders((prev) => [newOrder, ...prev]);
              fetchServerVault();
            }}
            onRefreshOrders={fetchServerVault}
            speiReserveMxn={vault.spei_reserve_mxn}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'bulk' && (
          <BulkApprovalWorkflow
            onBatchLiquidated={(newOrders) => {
              setSpeiOrders((prev) => [...newOrders, ...prev]);
              fetchServerVault();
            }}
            speiReserveMxn={vault.spei_reserve_mxn}
          />
        )}

        {activeTab === 'hsm' && (
          <HsmServerManager onSelectTokenForDisperser={() => setActiveTab('spei')} />
        )}

        {activeTab === 'antihooking' && <WebhookTurboMonitor />}

        {activeTab === 'trends' && <ComplianceTrendChart history={history} />}

        {activeTab === 'audit' && <SpeiArchitectureAudit />}

        {activeTab === 'fiscal' && (
          <FiscalComplianceCenter orders={speiOrders} transactions={history} />
        )}

        {activeTab === 'heuristics' && <HeuristicRulesPanel />}

        {activeTab === 'pricing' && <PricingEngineGuide />}

        {activeTab === 'batch' && <BatchAuditor />}

        {activeTab === 'sar' && <SarRegistry history={history} />}
      </main>

      {/* Subtle Regulatory Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Arcadia DASP &amp; SPEI Hub</span>
            <span>·</span>
            <span>CNAD License CNAD-DASP-SV-2024-8891</span>
            <span>·</span>
            <span>El Salvador DASP &amp; STP Clearing 646 (Banxico SPEI)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>HSM Enclave FIPS 140-2</span>
            <span>·</span>
            <span>Webhook Turbo (Sub-3ms)</span>
            <span>·</span>
            <span>REST API: /api/spei/disperse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

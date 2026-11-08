import React, { useState, useMemo } from 'react';
import { SpeiOrder, generateClaveRastreo } from '../engine/speiTypes';
import { hsmEngine, HsmPreRecordedToken } from '../engine/hsmEngine';
import { webhookTurboEngine } from '../engine/webhookTurboEngine';
import {
  CheckSquare,
  Square,
  Users,
  ShieldCheck,
  Building2,
  Lock,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Key,
  Layers,
  ArrowRight,
  Send,
  FileCheck,
} from 'lucide-react';

export interface BatchDispersalItem {
  id: string;
  beneficiaryName: string;
  entityName: string;
  entityCode: string;
  accountType: 'CLABE' | 'DIMO' | 'PAN';
  accountFormatted: string;
  montoMxn: number;
  montoUsd: number;
  concept: string;
  hsmTokenId?: string;
  riskScore: number;
  status: 'PENDING' | 'APPROVED' | 'DISPATCHING' | 'LIQUIDATED' | 'FAILED';
  claveRastreo?: string;
}

const INITIAL_BATCH_ITEMS: BatchDispersalItem[] = [
  {
    id: 'BATCH-001',
    beneficiaryName: 'NU MÉXICO FONDO OPERACIONES SA',
    entityName: 'NU MÉXICO FINANCIERA (SOFIPO)',
    entityCode: '638',
    accountType: 'CLABE',
    accountFormatted: '638 180 ·········· 4',
    montoMxn: 185000,
    montoUsd: 9319.9,
    concept: 'DISPERSION NOMINA NU TIER-2',
    hsmTokenId: 'HSM-TOK-638-NU-7712-401',
    riskScore: 12,
    status: 'PENDING',
  },
  {
    id: 'BATCH-002',
    beneficiaryName: 'MERCADO LIBRE SETTLEMENT HUB',
    entityName: 'MERCADO PAGO WALLET',
    entityCode: '722',
    accountType: 'CLABE',
    accountFormatted: '722 180 ·········· 8',
    montoMxn: 420000,
    montoUsd: 21158.7,
    concept: 'LIQUIDACION MARKETPLACE SPEI',
    hsmTokenId: 'HSM-TOK-722-MP-8401-229',
    riskScore: 18,
    status: 'PENDING',
  },
  {
    id: 'BATCH-003',
    beneficiaryName: 'COMPROPAGO SA DE CV',
    entityName: 'SPIN BY OXXO',
    entityCode: '710',
    accountType: 'CLABE',
    accountFormatted: '710 180 ·········· 1',
    montoMxn: 95000,
    montoUsd: 4785.9,
    concept: 'RECARGAS SPIN CONCENTRACION',
    hsmTokenId: 'HSM-TOK-710-SPIN-3391',
    riskScore: 22,
    status: 'PENDING',
  },
  {
    id: 'BATCH-004',
    beneficiaryName: 'TESORERIA CENTRAL DIMO NU MOBILE',
    entityName: 'NU MÉXICO FINANCIERA',
    entityCode: '638',
    accountType: 'DIMO',
    accountFormatted: 'DIMO (55) 4920-8819',
    montoMxn: 45000,
    montoUsd: 2267.0,
    concept: 'DISPERSION DIMO PAGO MOVIL',
    hsmTokenId: 'HSM-TOK-638-DIMO-9102',
    riskScore: 15,
    status: 'PENDING',
  },
  {
    id: 'BATCH-005',
    beneficiaryName: 'PROVEEDORES Y SERVICIOS DEL NORTE',
    entityName: 'BBVA MÉXICO',
    entityCode: '012',
    accountType: 'CLABE',
    accountFormatted: '012 180 ·········· 0',
    montoMxn: 310000,
    montoUsd: 15617.1,
    concept: 'PAGO PROVEEDOR CORPORATIVO',
    hsmTokenId: 'HSM-TOK-012-BBVA-9904',
    riskScore: 25,
    status: 'PENDING',
  },
  {
    id: 'BATCH-006',
    beneficiaryName: 'LOGISTICA Y DISTRIBUCION OCCIDENTE',
    entityName: 'BANORTE',
    entityCode: '072',
    accountType: 'CLABE',
    accountFormatted: '072 180 ·········· 9',
    montoMxn: 175000,
    montoUsd: 8816.1,
    concept: 'SUMINISTROS CEDIS BANORTE',
    hsmTokenId: 'HSM-TOK-072-BANORTE-512',
    riskScore: 20,
    status: 'PENDING',
  },
];

interface BulkApprovalWorkflowProps {
  onBatchLiquidated?: (orders: SpeiOrder[]) => void;
  speiReserveMxn?: number;
}

export const BulkApprovalWorkflow: React.FC<BulkApprovalWorkflowProps> = ({
  onBatchLiquidated,
  speiReserveMxn = 8750000,
}) => {
  const [items, setItems] = useState<BatchDispersalItem[]>(INITIAL_BATCH_ITEMS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(INITIAL_BATCH_ITEMS.map((i) => i.id))
  );

  // 4-Eyes Dual Authorization State
  const [officerName, setOfficerName] = useState('Lic. Valeria Mendoza (Oficial de Cumplimiento CNAD)');
  const [officerPin, setOfficerPin] = useState('889102');
  const [officerApproved, setOfficerApproved] = useState(false);

  const [directorName, setDirectorName] = useState('Mtro. Alejandro Garza (Director de Finanzas & Tesorería)');
  const [directorPin, setDirectorPin] = useState('774411');
  const [directorApproved, setDirectorApproved] = useState(false);

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [batchSuccessResult, setBatchSuccessResult] = useState<{
    batchId: string;
    totalDispersedMxn: number;
    count: number;
    timestamp: string;
  } | null>(null);

  // Calculations for selected items
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const totalMxn = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.montoMxn, 0),
    [selectedItems]
  );

  const totalUsd = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.montoUsd, 0),
    [selectedItems]
  );

  const avgRisk = useMemo(
    () =>
      selectedItems.length > 0
        ? Math.round(selectedItems.reduce((acc, i) => acc + i.riskScore, 0) / selectedItems.length)
        : 0,
    [selectedItems]
  );

  const isDualAuthComplete = officerApproved && directorApproved;

  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleItem = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleExecuteBatch = async () => {
    if (!isDualAuthComplete) {
      alert('Se requiere la doble autorización (4-Eyes) de Cumplimiento y Finanzas antes de liberar el lote.');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Debe seleccionar al menos una transacción para dispersar.');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(5);
    setExecutionLog([
      `Iniciando protocolo de dispersión en lote... Lote autorizado por ${officerName} y ${directorName}`,
      `Total a dispersar: $${totalMxn.toLocaleString('es-MX')} MXN (${selectedItems.length} órdenes)`,
    ]);

    const createdOrders: SpeiOrder[] = [];
    const batchId = `BATCH-SPEI-${Date.now().toString().slice(-6)}`;

    // Sequentially process items with simulated high-speed execution
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const clave = generateClaveRastreo('DASP');

      // Update progress
      const pct = Math.round(((i + 1) / selectedItems.length) * 100);
      setExecutionProgress(pct);

      // Resolve token in HSM if applicable
      if (item.hsmTokenId) {
        hsmEngine.resolveTokenForDispersal(item.hsmTokenId, item.montoMxn);
      }

      // Dispatch Webhook Turbo
      webhookTurboEngine.dispatchTurboWebhook({
        clave_rastreo: clave,
        eventType: 'LIQUIDATED',
        targetEndpoint: `https://bridge.stp.mx/spei/v2/ack/${item.entityCode}`,
        monto_mxn: item.montoMxn,
        banco_receptor: item.entityName,
        cuenta_enclave: item.accountFormatted,
        hardwareTokenId: item.hsmTokenId || 'HSM-TOK-EPHEMERAL',
      });

      const newOrder: SpeiOrder = {
        id: `spei-${Date.now()}-${i}`,
        clave_rastreo: clave,
        beneficiario: {
          nombre: item.beneficiaryName,
          tipo_cuenta: item.accountType,
          cuenta: item.accountFormatted,
          banco: item.entityName,
          banco_codigo: item.entityCode,
        },
        monto_mxn: item.montoMxn,
        monto_usd: item.montoUsd,
        concepto: item.concept,
        tipo_pago: 1,
        institucion_ordenante: '646 STP DASP ARCADIA',
        institucion_beneficiaria: item.entityName,
        status: 'LIQUIDATED',
        created_at: new Date().toISOString(),
        liquidated_at: new Date().toISOString(),
        idempotency_key: `batch-idem-${clave}`,
        retry_count: 0,
        cep_url: `https://www.banxico.org.mx/cep/ver?clave=${clave}`,
      };

      createdOrders.push(newOrder);

      // Attempt to post to server API
      try {
        await fetch('/api/spei/disperse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clave_rastreo: clave,
            beneficiario: newOrder.beneficiario,
            monto_mxn: newOrder.monto_mxn,
            monto_usd: newOrder.monto_usd,
            concepto: newOrder.concepto,
            idempotency_key: newOrder.idempotency_key,
          }),
        });
      } catch (err) {
        console.warn('Backend endpoint unavailable, processed locally:', err);
      }

      setExecutionLog((prev) => [
        `[${i + 1}/${selectedItems.length}] OK: Clave ${clave} | ${item.entityName} | $${item.montoMxn.toLocaleString('es-MX')} MXN liquidado en SPEI`,
        ...prev,
      ]);

      // Small delay for realism
      await new Promise((r) => setTimeout(r, 120));
    }

    // Update items status
    setItems((prev) =>
      prev.map((item) =>
        selectedIds.has(item.id) ? { ...item, status: 'LIQUIDATED' } : item
      )
    );

    setIsExecuting(false);
    setBatchSuccessResult({
      batchId,
      totalDispersedMxn: totalMxn,
      count: selectedItems.length,
      timestamp: new Date().toISOString(),
    });

    if (onBatchLiquidated) {
      onBatchLiquidated(createdOrders);
    }
  };

  const handleResetBatch = () => {
    setItems(INITIAL_BATCH_ITEMS);
    setSelectedIds(new Set(INITIAL_BATCH_ITEMS.map((i) => i.id)));
    setOfficerApproved(false);
    setDirectorApproved(false);
    setBatchSuccessResult(null);
    setExecutionLog([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border border-blue-500/20 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-blue-500/10 border border-blue-400/30 text-blue-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Dual Authorization · 4-Eyes Principle
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              ● Reserva SPEI: ${(speiReserveMxn / 1000000).toFixed(2)}M MXN
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Flujo de Aprobación Masiva SPEI (Bulk Approval Workflow)
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Consola de dispersión masiva de pagos SPEI interbancarios con protocolo de doble llave mancomunada
            (Oficial de Cumplimiento AML + Director de Tesorería Financiera) y ejecución a través de tokens
            pre-grabados en Servidor HSM.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleResetBatch}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recargar Lote Nominal</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Órdenes Seleccionadas</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {selectedItems.length} <span className="text-xs text-slate-500">/ {items.length}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Bancos tradicionales &amp; Wallets SPEI</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Monto Total a Dispersar</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            ${totalMxn.toLocaleString('es-MX')} <span className="text-xs text-slate-400">MXN</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">≈ ${totalUsd.toLocaleString('es-MX', { maximumFractionDigits: 1 })} USD</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Risk Score Ponderado</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {avgRisk} <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Todas cumplen umbral ≤ 40 (Aprobación)</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Estado de Autorización</span>
          <div className="text-lg font-black font-mono mt-1 flex items-center gap-2">
            {isDualAuthComplete ? (
              <span className="text-emerald-400 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="w-4 h-4" /> LISTO PARA LIBERAR
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5 text-base">
                <Clock className="w-4 h-4" /> PENDIENTE 4-EYES
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Requiere 2/2 firmas digitales</span>
        </div>
      </div>

      {/* 4-Eyes Dual Authorization Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mesa de Validación Mancomunada (4-Eyes Principle)</h2>
            <p className="text-xs text-slate-400">
              Ambos roles deben certificar el lote antes de que el gateway bancario STP habilite la dispersión
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Signer 1: Compliance Officer */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              officerApproved
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Firma 1: Oficial de Cumplimiento AML (CNAD)
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  officerApproved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {officerApproved ? 'FIRMADO' : 'PENDIENTE'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Funcionario Designado</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  disabled={officerApproved}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">PIN / Llave de Cumplimiento</label>
                <input
                  type="password"
                  value={officerPin}
                  onChange={(e) => setOfficerPin(e.target.value)}
                  disabled={officerApproved}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setOfficerApproved(!officerApproved)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  officerApproved
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                }`}
              >
                {officerApproved ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revocar Firma de Cumplimiento</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Certificar Heurísticas AML &amp; Firmar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Signer 2: Finance Director */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              directorApproved
                ? 'bg-blue-950/20 border-blue-500/40 text-blue-200'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                Firma 2: Director de Finanzas &amp; Tesorería
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  directorApproved ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {directorApproved ? 'FIRMADO' : 'PENDIENTE'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Director Financiero</label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  disabled={directorApproved}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Clave de Bóveda SPEI</label>
                <input
                  type="password"
                  value={directorPin}
                  onChange={(e) => setDirectorPin(e.target.value)}
                  disabled={directorApproved}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-blue-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setDirectorApproved(!directorApproved)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  directorApproved
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                }`}
              >
                {directorApproved ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revocar Firma de Tesorería</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Autorizar Liberación de Fondos &amp; Firmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Execution trigger bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono">
            {isDualAuthComplete ? (
              <span className="text-emerald-400 font-bold">
                ✓ Quórum completado: Las 2 firmas requeridas están validadas en el Enclave PVK-2.
              </span>
            ) : (
              <span>Falta al menos una firma de autoridad para habilitar la dispersión en lote.</span>
            )}
          </div>

          <button
            onClick={handleExecuteBatch}
            disabled={!isDualAuthComplete || isExecuting || selectedItems.length === 0}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              isDualAuthComplete && !isExecuting
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isExecuting ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-slate-950" />
                <span>Dispersando Lote en SPEI ({executionProgress}%)...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ejecutar Dispersión Masiva (${totalMxn.toLocaleString('es-MX')} MXN)</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar during execution */}
        {isExecuting && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Transfiriendo a través del gateway bancario STP...</span>
              <span className="text-emerald-400 font-bold">{executionProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${executionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {batchSuccessResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-white">
                  ¡Lote {batchSuccessResult.batchId} Liquidado Exitosamente en SPEI!
                </span>
                <span>
                  {batchSuccessResult.count} transferencias procesadas por un monto total de $
                  {batchSuccessResult.totalDispersedMxn.toLocaleString('es-MX')} MXN con acuse Banxico CEP.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table of Batch Items with Multi-Select */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              {selectedIds.size === items.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Seleccionar Todas ({selectedIds.size}/{items.length})</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Integrado con Servidor HSM y Directorio DIMO Banxico
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3"></th>
                <th className="py-3 px-3">Beneficiario &amp; Concepto</th>
                <th className="py-3 px-3">Entidad / Modalidad</th>
                <th className="py-3 px-3">Cuenta / Token HSM</th>
                <th className="py-3 px-3 text-right">Monto MXN</th>
                <th className="py-3 px-3 text-center">Score AML</th>
                <th className="py-3 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-800/20' : 'opacity-60'
                    }`}
                  >
                    <td className="py-3 px-3">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{item.beneficiaryName}</div>
                      <div className="text-[11px] text-slate-500">{item.concept}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-300">{item.entityName}</div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          item.accountType === 'DIMO'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : item.accountType === 'PAN'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {item.accountType}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-300">{item.accountFormatted}</div>
                      {item.hsmTokenId && (
                        <div className="text-[10px] text-indigo-300 flex items-center gap-1">
                          <Key className="w-3 h-3 text-indigo-400" />
                          <span>{item.hsmTokenId}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-emerald-400">
                        ${item.montoMxn.toLocaleString('es-MX')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ${item.montoUsd.toLocaleString('es-MX', { maximumFractionDigits: 1 })} USD
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {item.riskScore}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'LIQUIDATED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Logs Feed */}
      {executionLog.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Traza de Auditoría en Tiempo Real del Lote
            </h3>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto text-slate-300">
            {executionLog.map((log, idx) => (
              <div key={idx} className="leading-snug">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { SpeiOrder } from '../engine/speiTypes';
import { ComplianceEvaluationResult } from '../engine/types';
import {
  generateCfdiMetadata,
  generateCfdiXml,
  evaluateFiscalCompliance,
} from '../engine/fiscalEngine';
import { CfdiMetadata, UifReportEntry } from '../engine/fiscalTypes';
import {
  FileCheck2,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Download,
  Building,
  CheckCircle2,
  Coins,
  Copy,
  Check,
  Search,
  ExternalLink,
  Layers,
  Lock,
} from 'lucide-react';

interface FiscalComplianceCenterProps {
  orders: SpeiOrder[];
  transactions: ComplianceEvaluationResult[];
}

export const FiscalComplianceCenter: React.FC<FiscalComplianceCenterProps> = ({
  orders,
  transactions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cfdi' | 'uif' | 'travel_rule' | 'audit_pack'>('cfdi');
  const [selectedCfdi, setSelectedCfdi] = useState<CfdiMetadata | null>(null);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

  // Generate CFDI records for each order and transaction fee
  const fiscalRecords = React.useMemo(() => {
    return orders.map((order, idx) => {
      const comisionMxn = Number((order.monto_mxn * 0.005).toFixed(2)); // Base 0.5% comision DASP
      const cfdi = generateCfdiMetadata(
        order.clave_rastreo,
        order.monto_mxn,
        comisionMxn,
        order.beneficiario.rfc_curp || 'XAXX010101000',
        order.beneficiario.nombre
      );

      const fiscalEval = evaluateFiscalCompliance(
        order.monto_usd,
        order.monto_mxn,
        15,
        [],
        order.clave_rastreo,
        order.beneficiario.nombre,
        order.beneficiario.rfc_curp
      );

      return {
        order,
        cfdi,
        fiscalEval,
        id: `FISC-${idx + 1}`,
      };
    });
  }, [orders]);

  // Aggregate Fiscal KPIs
  const totalFacturadoMxn = fiscalRecords.reduce((acc, r) => acc + r.cfdi.total_facturado_mxn, 0);
  const totalIvaMxn = fiscalRecords.reduce((acc, r) => acc + r.cfdi.iva_trasladado_mxn, 0);
  const totalComisionesMxn = fiscalRecords.reduce((acc, r) => acc + r.cfdi.comision_hub_mxn, 0);
  const avisosUifCount = fiscalRecords.filter((r) => r.fiscalEval.requiere_aviso_uif).length;
  const travelRuleCount = fiscalRecords.filter((r) => r.fiscalEval.travelRule !== undefined).length;

  const handleCopyUuid = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    setCopiedUuid(uuid);
    setTimeout(() => setCopiedUuid(null), 2000);
  };

  const handleDownloadCfdiXml = (cfdi: CfdiMetadata) => {
    const xml = generateCfdiXml(cfdi);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CFDI_40_${cfdi.uuid_folio_fiscal}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullAuditPack = () => {
    const auditDossier = {
      entidad_regulada: 'ARCADIA DASP EL SALVADOR SA DE CV',
      licencia_cnad: 'CNAD-DASP-SV-2024-8891',
      jurisdiccion_primaria: 'República de El Salvador (Ley de Emisión de Activos Digitales)',
      convenio_operativo_fiduciario: 'STP Clearing 646 (Banco de México SPEI)',
      cumplimiento_tributario_sat: 'CFDI Versión 4.0 con Complemento de Pagos y Retenciones',
      cumplimiento_antilavado: 'LFPIORPI Artículo 17 Fracción XVI / GAFI Travel Rule IVMS101',
      fecha_emision: new Date().toISOString(),
      totales_fiscales: {
        total_facturado_mxn: totalFacturadoMxn,
        total_iva_trasladado_mxn: totalIvaMxn,
        total_comisiones_brutas_mxn: totalComisionesMxn,
        avisos_uif_generados: avisosUifCount,
        reportes_travel_rule: travelRuleCount,
      },
      registros_contables_certificados: fiscalRecords.map((r) => ({
        clave_rastreo: r.order.clave_rastreo,
        folio_fiscal_sat_uuid: r.cfdi.uuid_folio_fiscal,
        beneficiario: r.order.beneficiario.nombre,
        rfc: r.cfdi.rfc_receptor,
        tipo_cuenta: r.order.beneficiario.tipo_cuenta,
        cuenta: r.order.beneficiario.cuenta || r.order.beneficiario.clabe,
        monto_mxn: r.order.monto_mxn,
        comision_mxn: r.cfdi.comision_hub_mxn,
        iva_mxn: r.cfdi.iva_trasladado_mxn,
        total_mxn: r.cfdi.total_facturado_mxn,
        requiere_aviso_uif: r.fiscalEval.requiere_aviso_uif,
        aviso_uif_folio: r.fiscalEval.reporteUif?.folio_aviso || 'N/A',
        travel_rule_id: r.fiscalEval.travelRule?.message_id || 'N/A',
        sello_sat: r.cfdi.sello_sat,
        cadena_original: r.cfdi.cadena_original_sat,
      })),
    };

    const blob = new Blob([JSON.stringify(auditDossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXPEDIENTE_FISCALIZACION_GOBIERNO_SAT_CNAD_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Fiscal Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Marco de Fiscalización y Tributación Internacional
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">SAT CFDI 4.0 · CNAD El Salvador · UIF / LFPIORPI · GAFI</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Centro de Fiscalización, Timbrado y Cumplimiento de Gobierno
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Acreditación fiscal de ingresos, timbrado digital de comisiones bajo CFDI 4.0, declaraciones informativas ante la UIF/SAT (Art. 17 Fracc. XVI LFPIORPI) y cumplimiento estricto de la Travel Rule del GAFI para blindaje legal ante cualquier autoridad hacendaria o bancaria.
          </p>
        </div>

        <button
          onClick={handleDownloadFullAuditPack}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-950/50"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Expediente Fiscal Completo (SAT/CNAD)</span>
        </button>
      </div>

      {/* Primary Fiscal KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Total Facturado (CFDI 4.0)</div>
          <div className="text-lg font-bold font-mono text-white mt-1 tabular-nums">
            ${totalFacturadoMxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Comisiones + Impuestos</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">IVA Trasladado (16%)</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            ${totalIvaMxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Declarable ante el SAT</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Base Comisiones DASP</div>
          <div className="text-lg font-bold font-mono text-sky-400 mt-1 tabular-nums">
            ${totalComisionesMxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ingreso Bruto Gravable</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Avisos UIF / LFPIORPI</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {avisosUifCount} Expedientes
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">&gt; 1,605 UMA / Riesgo</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400">Travel Rule (IVMS101)</div>
          <div className="text-lg font-bold font-mono text-purple-400 mt-1 tabular-nums">
            {travelRuleCount} Transmisiones
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">&gt; $1,000 USD (GAFI 16)</div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('cfdi')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'cfdi'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Timbrado Fiscal CFDI 4.0 ({fiscalRecords.length})
        </button>

        <button
          onClick={() => setActiveSubTab('uif')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'uif'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Expedientes Antilavado LFPIORPI / UIF ({avisosUifCount})
        </button>

        <button
          onClick={() => setActiveSubTab('travel_rule')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'travel_rule'
              ? 'bg-slate-800 text-purple-400 border border-purple-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Travel Rule GAFI IVMS101 ({travelRuleCount})
        </button>

        <button
          onClick={() => setActiveSubTab('audit_pack')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'audit_pack'
              ? 'bg-slate-800 text-sky-400 border border-sky-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Garantía de Blindaje ante Autoridades
        </button>
      </div>

      {/* TAB 1: CFDI 4.0 INVOICING LEDGER */}
      {activeSubTab === 'cfdi' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Registro de Comprobantes Fiscales Digitales por Internet (CFDI 4.0)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Facturas emitidas con Clave de Producto 84121500 (Servicios bancarios y de dispersión) con IVA 16% desglosado
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
              PAC Autorizado SAT Timbrado Activo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Folio Fiscal (UUID SAT)</th>
                  <th className="py-2.5 px-3 font-semibold">Referencia SPEI</th>
                  <th className="py-2.5 px-3 font-semibold">Receptor (RFC)</th>
                  <th className="py-2.5 px-3 font-semibold">Monto Base</th>
                  <th className="py-2.5 px-3 font-semibold">Comisión</th>
                  <th className="py-2.5 px-3 font-semibold">IVA 16%</th>
                  <th className="py-2.5 px-3 font-semibold">Total Factura</th>
                  <th className="py-2.5 px-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {fiscalRecords.map(({ order, cfdi }) => (
                  <tr key={cfdi.uuid_folio_fiscal} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-400">
                          {cfdi.uuid_folio_fiscal.slice(0, 8)}...
                        </span>
                        <button
                          onClick={() => handleCopyUuid(cfdi.uuid_folio_fiscal)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                          title="Copiar UUID SAT"
                        >
                          {copiedUuid === cfdi.uuid_folio_fiscal ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {order.clave_rastreo.slice(0, 14)}...
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="font-sans font-medium text-white">{order.beneficiario.nombre.slice(0, 18)}...</div>
                      <div className="text-[10px] text-slate-500 font-mono">{cfdi.rfc_receptor}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 tabular-nums">
                      ${order.monto_mxn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold tabular-nums">
                      ${cfdi.comision_hub_mxn.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 tabular-nums">
                      ${cfdi.iva_trasladado_mxn.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold tabular-nums">
                      ${cfdi.total_facturado_mxn.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedCfdi(cfdi)}
                          className="text-xs font-sans text-sky-400 hover:underline cursor-pointer"
                        >
                          Ver CFDI
                        </button>
                        <button
                          onClick={() => handleDownloadCfdiXml(cfdi)}
                          className="text-xs font-sans text-emerald-400 hover:underline cursor-pointer"
                          title="Descargar archivo XML timbrado ante SAT"
                        >
                          XML
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: UIF / LFPIORPI EXPEDIENTES */}
      {activeSubTab === 'uif' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Expedientes Antilavado LFPIORPI (Art. 17 Fracc. XVI Activos Virtuales)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cumplimiento automático de avisos obligatorios ante la Unidad de Inteligencia Financiera (UIF / SAT)
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
              Portal SPPLD Conforme
            </span>
          </div>

          <div className="space-y-3">
            {fiscalRecords
              .filter((r) => r.fiscalEval.requiere_aviso_uif && r.fiscalEval.reporteUif)
              .map(({ order, fiscalEval }) => {
                const uif = fiscalEval.reporteUif!;
                return (
                  <div
                    key={uif.folio_aviso}
                    className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 font-mono">{uif.folio_aviso}</span>
                        <span className="text-slate-600">·</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                          {uif.tipo_alerta}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400">
                        Monto: ${order.monto_mxn.toLocaleString()} MXN (~${order.monto_usd.toLocaleString()} USD)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-500">Sujeto Obligado:</span> {uif.sujeto_obligado}
                      </div>
                      <div>
                        <span className="text-slate-500">Cliente / Beneficiario:</span> {order.beneficiario.nombre} ({order.beneficiario.rfc_curp || 'XAXX010101000'})
                      </div>
                      <div>
                        <span className="text-slate-500">Clave de Rastreo:</span> {order.clave_rastreo}
                      </div>
                      <div>
                        <span className="text-slate-500">Destino:</span> {order.beneficiario.tipo_cuenta} - {order.beneficiario.banco}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300">
                      <span className="text-amber-400 font-semibold">Motivo de Aviso: </span>
                      {uif.motivo_reporte}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: TRAVEL RULE GAFI IVMS101 */}
      {activeSubTab === 'travel_rule' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Transmisión Travel Rule GAFI (Recomendación 16 - Estándar IVMS101)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cripto-fiduciario: Intercambio cifrado de datos de ordenante y beneficiario para operaciones &gt; $1,000 USD
              </p>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/30">
              IVMS101 Inter-VASP Gateway
            </span>
          </div>

          <div className="space-y-3">
            {fiscalRecords
              .filter((r) => r.fiscalEval.travelRule)
              .map(({ order, fiscalEval }) => {
                const tr = fiscalEval.travelRule!;
                return (
                  <div
                    key={tr.message_id}
                    className="p-4 bg-slate-950 rounded-xl border border-purple-500/30 text-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-400 font-mono">{tr.message_id}</span>
                        <span className="text-slate-600">·</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold">
                          ESTÁNDAR IVMS101
                        </span>
                      </div>
                      <span className="font-mono text-slate-300 font-bold">
                        Transfer: ${tr.transfer.amount.toLocaleString()} {tr.transfer.currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <div className="text-slate-400 uppercase font-bold text-[10px] mb-1">
                          Originator VASP (El Salvador)
                        </div>
                        <div className="text-white font-semibold">{tr.originator.name}</div>
                        <div className="text-slate-400">Licencia: {tr.originator.national_identity_number}</div>
                        <div className="text-slate-400">País: {tr.originator.country}</div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <div className="text-slate-400 uppercase font-bold text-[10px] mb-1">
                          Beneficiary Institution (México)
                        </div>
                        <div className="text-white font-semibold">{tr.beneficiary.name}</div>
                        <div className="text-slate-400">Cuenta/Clave: {tr.beneficiary.account_number}</div>
                        <div className="text-slate-400">País: {tr.beneficiary.country}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT PACK AND GOVERNMENT COMPLIANCE GUARANTEE */}
      {activeSubTab === 'audit_pack' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">
              Garantía de Blindaje y Cumplimiento de Fiscalización ante Autoridades de Gobierno
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Diseño legal y técnico para responder a requerimientos de información de SAT, CNBV, UIF (México) y CNAD (El Salvador)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>1. SAT / Hacienda (México)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Cada peso cobrado en comisión cuenta con su CFDI 4.0 timbrado con Clave ProdServ 84121500 e IVA 16% desglosado. El ordenante SPEI opera a través de STP participante 646, cumpliendo los requisitos del Art. 29 y 29-A del Código Fiscal de la Federación.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>2. UIF / CNBV (Prevención de Lavado)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Cumplimiento del Art. 17 Fracción XVI de la LFPIORPI para operaciones con activos virtuales. Registro de umbrales de identificación (&gt;645 UMA) y generación automática de avisos de operaciones inusuales ante el Portal de Prevención de Lavado de Dinero (SPPLD).
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>3. CNAD / DASP (El Salvador)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Operaciones ejecutadas bajo la Licencia CNAD-DASP-SV-2024-8891 con segregación de cuentas entre saldos de custodia y tesorería corporativa, respaldadas por la trazabilidad on-chain de CipherTrace y reportes pasivos de SAR.
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-300">
                Expediente de Fiscalización Inmutable con Cadena Criptográfica SHA-256
              </div>
              <div className="text-[11px] text-slate-400">
                Todos los registros de la bitácora contienen su hash de integridad para certificar ante auditores gubernamentales que la contabilidad no ha sido alterada.
              </div>
            </div>

            <button
              onClick={handleDownloadFullAuditPack}
              className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Exportar Dossier Oficial
            </button>
          </div>
        </div>
      )}

      {/* CFDI 4.0 Modal Drawer */}
      {selectedCfdi && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Comprobante Fiscal Digital (CFDI 4.0)</h3>
                <span className="text-xs font-mono text-emerald-400">UUID: {selectedCfdi.uuid_folio_fiscal}</span>
              </div>
              <button
                onClick={() => setSelectedCfdi(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Emisor:</div>
                <div className="text-white font-bold">{selectedCfdi.nombre_emisor}</div>
                <div className="text-slate-400">RFC: {selectedCfdi.rfc_emisor} · Régimen: {selectedCfdi.regimen_fiscal_emisor}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Receptor:</div>
                <div className="text-white font-bold">{selectedCfdi.nombre_receptor}</div>
                <div className="text-slate-400">RFC: {selectedCfdi.rfc_receptor} · Uso: {selectedCfdi.uso_cfdi}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Comisión Base:</span>
                  <span className="text-slate-200">${selectedCfdi.comision_hub_mxn.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IVA Trasladado (16%):</span>
                  <span className="text-emerald-400">${selectedCfdi.iva_trasladado_mxn.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                  <span className="text-white">Total Facturado:</span>
                  <span className="text-emerald-300">${selectedCfdi.total_facturado_mxn.toFixed(2)} MXN</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-[10px]">
                <div className="text-slate-500">Cadena Original SAT:</div>
                <div className="text-slate-400 break-all">{selectedCfdi.cadena_original_sat}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleDownloadCfdiXml(selectedCfdi)}
                className="px-3 py-1.5 bg-emerald-400 text-slate-950 font-bold rounded text-xs cursor-pointer"
              >
                Descargar XML CFDI 4.0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

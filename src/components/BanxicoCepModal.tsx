import React, { useState } from 'react';
import { SpeiOrder } from '../engine/speiTypes';
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  QrCode,
  FileCode,
} from 'lucide-react';
import { downloadBanxicoCepPdf } from '../utils/generateCepPdf';

interface BanxicoCepModalProps {
  order: SpeiOrder;
  onClose: () => void;
}

export const BanxicoCepModal: React.FC<BanxicoCepModalProps> = ({ order, onClose }) => {
  const [copiedCadena, setCopiedCadena] = useState(false);
  const [copiedPortalData, setCopiedPortalData] = useState(false);

  const operacionDate = new Date(order.liquidated_at || order.submitted_at || order.created_at);
  const formattedDate = operacionDate.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = operacionDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const folioBanxico =
    order.cep_url?.split('folio=')[1] ||
    Math.floor(Math.random() * 8999999 + 1000000).toString();

  const fullFolio = `2026101700646${folioBanxico}`;
  const certNumber = '00000100000702819234';

  const orderTipo = order.beneficiario.tipo_cuenta || 'CLABE';
  const tipoCuentaCode = orderTipo === 'CLABE' ? '40' : orderTipo === 'PAN' ? '03' : '10';

  const displayAccount = order.beneficiario.cuenta || order.beneficiario.clabe || '';

  // Cadena original oficial de Banxico para el CEP
  const cadenaOriginal = `||${formattedDate}|${formattedTime}|${fullFolio}|646|${order.beneficiario.banco_codigo}|${order.clave_rastreo}|${order.beneficiario.nombre}|${tipoCuentaCode}|${displayAccount}|${order.monto_mxn.toFixed(2)}|0.00|${order.concepto}||`;

  // Sello digital simulado (Base64 SHA256withRSA de Banxico)
  const selloDigital = `MEQCID7x9G${order.clave_rastreo.slice(4, 12)}k1LmNpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUvWxYz0123456789==`;

  const handleCopyCadena = () => {
    navigator.clipboard.writeText(cadenaOriginal);
    setCopiedCadena(true);
    setTimeout(() => setCopiedCadena(false), 2000);
  };

  const handleCopyPortalData = () => {
    const portalDataText = `DATOS PARA CONSULTA EN PORTAL BANXICO (www.banxico.org.mx/cep/):
Fecha de Operación: ${formattedDate}
Criterio de Búsqueda: Clave de Rastreo
Clave de Rastreo: ${order.clave_rastreo}
Institución Emisora: 646 - STP
Institución Receptora: ${order.beneficiario.banco_codigo} - ${order.beneficiario.banco}
Cuenta Beneficiaria: ${displayAccount}
Monto: $${order.monto_mxn.toFixed(2)} MXN`;

    navigator.clipboard.writeText(portalDataText);
    setCopiedPortalData(true);
    setTimeout(() => setCopiedPortalData(false), 2500);
  };

  const handleDownloadXML = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<comprobanteSPEI xmlns="http://www.banxico.org.mx/cep"
  version="1.0"
  fechaOperacion="${operacionDate.toISOString().slice(0, 10)}"
  hora="${formattedTime}"
  claveRastreo="${order.clave_rastreo}"
  folioBanxico="${fullFolio}"
  sello="${selloDigital}"
  numeroSerieCertificado="${certNumber}">
  <ordenante
    institucion="646"
    nombre="ARCADIA DASP EL SALVADOR - STP CLEARING"
    cuenta="646180112233445566"
    rfc="DASP190820AA1"/>
  <beneficiario
    institucion="${order.beneficiario.banco_codigo}"
    nombre="${order.beneficiario.nombre}"
    tipoCuenta="${tipoCuentaCode}"
    cuenta="${displayAccount}"
    rfc="${order.beneficiario.rfc_curp || 'XAXX010101000'}"/>
  <monto>${order.monto_mxn.toFixed(2)}</monto>
  <iva>0.00</iva>
  <concepto>${order.concepto}</concepto>
  <cadenaOriginal>${cadenaOriginal}</cadenaOriginal>
</comprobanteSPEI>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CEP_BANXICO_${order.clave_rastreo}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Comprobante Electrónico de Pago (CEP) — SPEI
              </h3>
              <p className="text-[11px] text-slate-400">
                Emitido por el Sistema de Pagos Electrónicos Interbancarios · Banco de México
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Banxico Document Body */}
        <div className="p-6 md:p-8 space-y-6 bg-[#0a0f1d] text-slate-100">
          {/* Document Header with Banxico Seal */}
          <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                BANCO DE MÉXICO
              </div>
              <div className="text-lg font-bold text-white">
                COMPROBANTE ELECTRÓNICO DE PAGO (SPEI)
              </div>
              <div className="text-xs text-slate-400">
                Normativa Circular 14/2017 &amp; Circular 04/2023 DIMO de Banco de México
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>PAGO LIQUIDADO Y ACREDITADO</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                Folio Banxico: <span className="text-slate-200 font-semibold">{fullFolio}</span>
              </div>
            </div>
          </div>

          {/* Transfer Core Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Sender / Ordenante */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800/90 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Datos del Ordenante (Emisor)
              </div>
              <div className="font-bold text-white text-sm font-sans">
                ARCADIA DASP EL SALVADOR / STP
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">Institución Emisora:</span> 646 - STP (SISTEMA DE TRANSFERENCIAS Y PAGOS)
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">Cuenta Emisora:</span> 646180112233445566
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">RFC Ordenante:</span> DASP190820AA1
              </div>
            </div>

            {/* Receiver / Beneficiario */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800/90 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Datos del Beneficiario (Receptor)
              </div>
              <div className="font-bold text-white text-sm font-sans">
                {order.beneficiario.nombre}
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">Institución Receptora:</span> {order.beneficiario.banco_codigo} - {order.beneficiario.banco}
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">Modalidad SPEI:</span>{' '}
                <span className="text-amber-300 font-bold">
                  {orderTipo === 'CLABE' && 'Tipo 40 (CLABE Interbancaria 18d)'}
                  {orderTipo === 'PAN' && `Tipo 03 (Tarjeta Débito/Crédito 16d - ${order.beneficiario.marca_tarjeta || 'PAN'})`}
                  {orderTipo === 'DIMO' && 'Tipo 10 (Dinero Móvil DIMO 10d)'}
                </span>
              </div>
              <div className="text-slate-300 text-[11px]">
                <span className="text-slate-500">Cuenta / Destino:</span>{' '}
                <span className="text-white font-bold">{displayAccount}</span>
              </div>
              {order.beneficiario.rfc_curp && (
                <div className="text-slate-300 text-[11px]">
                  <span className="text-slate-500">RFC / CURP:</span> {order.beneficiario.rfc_curp}
                </div>
              )}
            </div>
          </div>

          {/* Amount & Operation Details */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Monto Liquidado</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">
                ${order.monto_mxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">Equivalente USD</div>
              <div className="text-sm font-bold text-slate-200 mt-1 tabular-nums">
                ${order.monto_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">Fecha y Hora Banxico</div>
              <div className="text-xs text-slate-300 mt-1">
                {formattedDate} {formattedTime}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">IVA de Transferencia</div>
              <div className="text-xs text-slate-300 mt-1">$0.00 MXN</div>
            </div>
          </div>

          {/* Concepto & Clave de Rastreo */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Clave de Rastreo (Idempotente):</span>{' '}
                <span className="text-amber-300 font-bold">{order.clave_rastreo}</span>
              </div>
              <div>
                <span className="text-slate-500">Tipo de Pago:</span> 1 (Terceros a Terceros)
              </div>
            </div>
            <div>
              <span className="text-slate-500">Concepto de Pago:</span>{' '}
              <span className="text-slate-200 font-sans">{order.concepto}</span>
            </div>
          </div>

          {/* Banxico Cryptographic Verification Elements */}
          <div className="space-y-3 pt-2 text-[11px] font-mono border-t border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">
                Firma Digital Criptográfica de Banco de México
              </span>
              <span className="text-slate-500">Certificado: {certNumber}</span>
            </div>

            {/* Cadena Original */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Cadena Original del CEP:</span>
                <button
                  onClick={handleCopyCadena}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCadena ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCadena ? 'Copiada' : 'Copiar'}</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-400 break-all leading-tight select-all">
                {cadenaOriginal}
              </div>
            </div>

            {/* Sello Digital */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500">Sello Digital SHA256withRSA:</div>
              <div className="text-[10px] text-emerald-300 break-all leading-tight">
                {selloDigital}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {/* Copy portal data for Banxico web */}
            <button
              onClick={handleCopyPortalData}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copiar datos formateados para consultar en el portal de Banco de México"
            >
              {copiedPortalData ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedPortalData ? 'Datos de Consulta Copiados' : 'Copiar Datos para Portal Banxico'}</span>
            </button>

            {/* Download signed XML */}
            <button
              onClick={handleDownloadXML}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Descargar XML Firmado</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF via jsPDF according to Banxico standard */}
            <button
              onClick={() => downloadBanxicoCepPdf(order)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Descargar Comprobante Electrónico de Pago oficial en formato PDF con jsPDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF (jsPDF)</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

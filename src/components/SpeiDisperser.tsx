import React, { useState, useMemo } from 'react';
import {
  SpeiOrder,
  SpeiAccountType,
  validateAccount,
  validateCLABE,
  validatePAN,
  validateDIMO,
  generateClaveRastreo,
  MEXICAN_BANKS,
  AccountValidationResult,
} from '../engine/speiTypes';
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  CreditCard,
  Smartphone,
  Building2,
  CheckCheck,
  Download,
  FileText,
} from 'lucide-react';
import { BanxicoCepModal } from './BanxicoCepModal';
import { downloadBanxicoCepPdf } from '../utils/generateCepPdf';
import { hsmEngine, HsmPreRecordedToken } from '../engine/hsmEngine';
import { Key, Server, Flame, Users, Lock, Unlock } from 'lucide-react';

// Strict regex patterns for validation
export const REGEX_CLABE = /^\d{18}$/;
export const REGEX_PAN = /^\d{16}$/;
export const REGEX_DIMO = /^\d{10}$/;
export const REGEX_DIMO_NATIONAL = /^[2-9]\d{9}$/;

interface SpeiDisperserProps {
  orders: SpeiOrder[];
  onOrderSubmitted: (newOrder: SpeiOrder) => void;
  onRefreshOrders: () => void;
  speiReserveMxn: number;
  onNavigateTab?: (tab: string) => void;
}

// Input masking formatter for PAN 16d: XXXX XXXX XXXX XXXX
export function maskPan(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, '').slice(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(' ') : digits;
}

// Input masking formatter for DIMO 10d: (XX) XXXX-XXXX
export function maskDimo(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

// Input masking formatter for CLABE 18d: XXX XXX XXXXXXXXXXX X
export function maskClabe(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, '').slice(0, 18);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 17) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 17)} ${digits.slice(17, 18)}`;
}

export const SpeiDisperser: React.FC<SpeiDisperserProps> = ({
  orders,
  onOrderSubmitted,
  onRefreshOrders,
  speiReserveMxn,
  onNavigateTab,
}) => {
  // Destination Account Type: CLABE (18d), PAN (16d), DIMO (10d)
  const [tipoCuenta, setTipoCuenta] = useState<SpeiAccountType>('CLABE');
  const [selectedHsmTokenId, setSelectedHsmTokenId] = useState<string>('');
  const [hsmTokens] = useState<HsmPreRecordedToken[]>(() => hsmEngine.getTokens());

  // Form State - dedicated states storing pure clean digits for each modality
  const [clabeValue, setClabeValue] = useState<string>('012180001234567890');
  const [panValue, setPanValue] = useState<string>('4152313456789012');
  const [dimoValue, setDimoValue] = useState<string>('5512345678');

  // Security Lock State: Locks destination fields when populated from HSM pre-validated token registry
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Bank selection (for PAN and DIMO routing)
  const [selectedBankCode, setSelectedBankCode] = useState<string>('012'); // BBVA default

  // General Beneficiary & Payment Info
  const [nombre, setNombre] = useState('PROVEEDORES Y SERVICIOS DEL NORTE SA');
  const [rfc, setRfc] = useState('PSN180412AA9');
  const [montoMxn, setMontoMxn] = useState(25000);
  const [concepto, setConcepto] = useState('LIQUIDACION DISPERSION DASP');
  const [claveRastreo, setClaveRastreo] = useState(() => generateClaveRastreo('DASP'));
  const [idempotencyKey, setIdempotencyKey] = useState(() => 'idem-' + Math.random().toString(36).substring(2, 10));

  // Loading & status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedClave, setCopiedClave] = useState<string | null>(null);
  const [selectedCepOrder, setSelectedCepOrder] = useState<SpeiOrder | null>(null);

  // Regex-based validation evaluations
  const cleanClabe = useMemo(() => clabeValue.replace(/\D/g, ''), [clabeValue]);
  const cleanPan = useMemo(() => panValue.replace(/\D/g, ''), [panValue]);
  const cleanDimo = useMemo(() => dimoValue.replace(/\D/g, ''), [dimoValue]);

  // Active clean numeric string
  const activeCleanAccount = useMemo(() => {
    if (tipoCuenta === 'PAN') return cleanPan;
    if (tipoCuenta === 'DIMO') return cleanDimo;
    return cleanClabe;
  }, [tipoCuenta, cleanPan, cleanDimo, cleanClabe]);

  // VALIDATION LAYER: Checks in real time if input destination exists in HSM Pre-Validated Registry
  const matchedHsmToken: HsmPreRecordedToken | undefined = useMemo(() => {
    if (!activeCleanAccount || activeCleanAccount.length < 8) return undefined;
    return hsmEngine.findTokenByAccount(activeCleanAccount, tipoCuenta);
  }, [activeCleanAccount, tipoCuenta, hsmTokens]);

  const isClabeRegexValid = useMemo(() => REGEX_CLABE.test(cleanClabe), [cleanClabe]);
  const isPanRegexValid = useMemo(() => REGEX_PAN.test(cleanPan), [cleanPan]);
  const isDimoRegexValid = useMemo(() => REGEX_DIMO.test(cleanDimo), [cleanDimo]);
  const isDimoNationalValid = useMemo(() => REGEX_DIMO_NATIONAL.test(cleanDimo), [cleanDimo]);

  // Modulo & algorithm validations
  const clabeValidation: AccountValidationResult = useMemo(
    () => validateCLABE(cleanClabe),
    [cleanClabe]
  );
  const panValidation: AccountValidationResult = useMemo(
    () => validatePAN(cleanPan, selectedBankCode),
    [cleanPan, selectedBankCode]
  );
  const dimoValidation: AccountValidationResult = useMemo(
    () => validateDIMO(cleanDimo, selectedBankCode),
    [cleanDimo, selectedBankCode]
  );

  // Active validation based on chosen destination type
  const activeValidation: AccountValidationResult = useMemo(() => {
    if (tipoCuenta === 'PAN') return panValidation;
    if (tipoCuenta === 'DIMO') return dimoValidation;
    return clabeValidation;
  }, [tipoCuenta, panValidation, dimoValidation, clabeValidation]);

  // Active regex validity
  const activeRegexValid = useMemo(() => {
    if (tipoCuenta === 'PAN') return isPanRegexValid;
    if (tipoCuenta === 'DIMO') return isDimoRegexValid && isDimoNationalValid;
    return isClabeRegexValid;
  }, [tipoCuenta, isPanRegexValid, isDimoRegexValid, isDimoNationalValid, isClabeRegexValid]);

  const montoUsd = Number((montoMxn / 19.85).toFixed(2));

  // Automatically populate destination fields and lock them against unauthorized tampering
  const handleSelectHsmToken = (tokenId: string) => {
    setSelectedHsmTokenId(tokenId);
    if (!tokenId) {
      setIsLocked(false);
      return;
    }

    const token = hsmTokens.find((t) => t.tokenId === tokenId);
    if (token) {
      setNombre(token.beneficiaryName);
      setRfc(token.rfcCurp);
      setTipoCuenta(token.accountType);
      setSelectedBankCode(token.entityCode);

      const clean = token.cleanAccount || token.maskedAccount.replace(/\D/g, '');
      if (token.accountType === 'CLABE') {
        setClabeValue(clean);
      } else if (token.accountType === 'DIMO') {
        setDimoValue(clean);
      } else {
        setPanValue(clean);
      }

      setConcepto(`DISPERSION ENCLAVE ${token.tokenId}`);
      setIsLocked(true); // LOCK DESTINATION FIELDS
      setErrorMsg(null);
      setSuccessMsg(`Token HSM ${token.tokenId} activado: Campos de destino bloqueados por enclave criptográfico.`);
    }
  };

  const handleUnlockFields = () => {
    setIsLocked(false);
    setSelectedHsmTokenId('');
    setSuccessMsg(null);
  };

  // Switch destination type
  const handleSelectTipoCuenta = (newType: SpeiAccountType) => {
    if (isLocked) return; // Prevent modality change when locked
    setTipoCuenta(newType);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newType === 'PAN' && selectedBankCode === '012') {
      setSelectedBankCode('002'); // Banamex default for cards
    } else if (newType === 'DIMO' && selectedBankCode === '012') {
      setSelectedBankCode('072'); // Banorte default for DIMO
    }
  };

  // Quick Preset Scenarios
  const handleApplyPreset = (preset: {
    nombre: string;
    tipo: SpeiAccountType;
    cuenta: string;
    banco: string;
    monto: number;
    concepto: string;
  }) => {
    setNombre(preset.nombre);
    setTipoCuenta(preset.tipo);
    setSelectedBankCode(preset.banco);
    setMontoMxn(preset.monto);
    setConcepto(preset.concepto);
    setClaveRastreo(generateClaveRastreo('DASP'));
    setIdempotencyKey('idem-' + Math.random().toString(36).substring(2, 10));
    setIsLocked(false);
    setSelectedHsmTokenId('');
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = preset.cuenta.replace(/\D/g, '');
    if (preset.tipo === 'CLABE') {
      setClabeValue(clean);
    } else if (preset.tipo === 'PAN') {
      setPanValue(clean);
    } else if (preset.tipo === 'DIMO') {
      setDimoValue(clean);
    }
  };

  // Synchronous Submission (POST /api/spei/disperse -> HTTP 202 SUBMITTED)
  // Ensures clean data submission (only unmasked numeric string)
  const handleDisperse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Regex validation check before submission
    if (tipoCuenta === 'PAN' && !REGEX_PAN.test(cleanPan)) {
      setErrorMsg(`Validación Regex Fallida: El número de tarjeta PAN debe contener exactamente 16 dígitos (${cleanPan.length}/16)`);
      return;
    }
    if (tipoCuenta === 'DIMO' && !REGEX_DIMO.test(cleanDimo)) {
      setErrorMsg(`Validación Regex Fallida: El número de celular DIMO debe contener exactamente 10 dígitos (${cleanDimo.length}/10)`);
      return;
    }
    if (tipoCuenta === 'CLABE' && !REGEX_CLABE.test(cleanClabe)) {
      setErrorMsg(`Validación Regex Fallida: La cuenta CLABE debe contener exactamente 18 dígitos (${cleanClabe.length}/18)`);
      return;
    }

    // 2. Algorithm / checksum verification
    if (!activeValidation.valid) {
      setErrorMsg(`Destino inválido (${tipoCuenta}): ${activeValidation.error}`);
      return;
    }

    if (montoMxn > speiReserveMxn) {
      setErrorMsg(`Fondos insuficientes en la reserva SPEI. Disponible: $${speiReserveMxn.toLocaleString()} MXN`);
      return;
    }

    setLoading(true);

    try {
      // Clean unmasked numeric value for submission
      const cleanAccountToSubmit =
        tipoCuenta === 'PAN' ? cleanPan : tipoCuenta === 'DIMO' ? cleanDimo : cleanClabe;

      const payload = {
        clave_rastreo: claveRastreo.trim(),
        beneficiario: {
          nombre: nombre.trim().toUpperCase(),
          tipo_cuenta: tipoCuenta,
          cuenta: cleanAccountToSubmit, // Clean unmasked digits sent to API
          clabe: cleanAccountToSubmit,  // Backwards compatibility
          rfc_curp: rfc.trim().toUpperCase(),
          banco: activeValidation.bankName,
          banco_codigo: activeValidation.bankCode,
          marca_tarjeta: activeValidation.cardBrand,
        },
        monto_mxn: montoMxn,
        monto_usd: montoUsd,
        concepto: concepto.trim().toUpperCase(),
        idempotency_key: idempotencyKey.trim(),
      };

      const res = await fetch('/api/spei/disperse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en liberación SPEI');
      }

      if (selectedHsmTokenId) {
        hsmEngine.resolveTokenForDispersal(selectedHsmTokenId, montoMxn);
      }

      setSuccessMsg(
        `HTTP 202 Accepted: Dispersión liberada vía ${tipoCuenta} (${cleanAccountToSubmit}) con Clave de Rastreo ${data.order.clave_rastreo}${
          isLocked ? ' [Protegido por Token HSM]' : ''
        }`
      );
      onOrderSubmitted(data.order);

      // Regenerate for next order
      setClaveRastreo(generateClaveRastreo('DASP'));
      setIdempotencyKey('idem-' + Math.random().toString(36).substring(2, 10));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar dispersión SPEI';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Asynchronous Webhook (LIQUIDATED or REJECTED)
  const handleSimulateWebhook = async (order: SpeiOrder, estado: 'LIQUIDATED' | 'REJECTED') => {
    try {
      const webhookPayload = {
        clave_rastreo: order.clave_rastreo,
        id: order.id,
        estado,
        fecha_operacion: new Date().toISOString(),
        monto: order.monto_mxn,
        institucion_beneficiaria: order.beneficiario.banco_codigo,
        cuenta_beneficiaria: order.beneficiario.cuenta || order.beneficiario.clabe || '',
        tipo_cuenta: order.beneficiario.tipo_cuenta || 'CLABE',
        motivo_devolucion: estado === 'REJECTED' ? 'CUENTA O NÚMERO CANCELADO / INEXISTENTE (DEVOLUCION 04)' : undefined,
        folio_banxico: Math.floor(Math.random() * 8999999 + 1000000).toString(),
      };

      const res = await fetch('/api/spei/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error al procesar webhook: ${data.error}`);
      } else {
        onRefreshOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Polling Fallback Trigger
  const handlePollLimbo = async () => {
    try {
      const res = await fetch('/api/spei/poll-limbo', { method: 'POST' });
      const data = await res.json();
      alert(`Polling ejecutado: ${data.polledCount} transacciones en limbo sincronizadas.`);
      onRefreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedClave(text);
    setTimeout(() => setCopiedClave(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Title & SPEI Status */}
      <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Sistema de Pagos Electrónicos Interbancarios
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Banco de México / STP Clearing 646</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Dispersador SPEI Multimodal: CLABE (18d), PAN (16d) &amp; DIMO (10d)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Liberación síncrona hacia cuentas CLABE interbancarias, tarjetas de débito/crédito (PAN con algoritmo Luhn) y transferencias móviles Banxico DIMO mediante número celular a 10 dígitos. Incluye enmascaramiento dinámico y validación regex previa a la transmisión.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('bulk')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-semibold text-blue-300 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Lote Masivo (4-Eyes)</span>
              </button>
              <button
                onClick={() => onNavigateTab('hsm')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Servidor HSM</span>
              </button>
              <button
                onClick={() => onNavigateTab('antihooking')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Webhook Turbo</span>
              </button>
            </div>
          )}

          <button
            onClick={handlePollLimbo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Consultar transacciones en estado SUBMITTED que no han recibido webhook"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Polling Fallback</span>
          </button>

          <button
            onClick={onRefreshOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Quick Preset Channels Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Escenarios de Prueba Rápidos por Modalidad SPEI
          </label>
          <span className="text-xs text-slate-500">
            Cargar datos de prueba verificados para CLABE, Tarjeta PAN o Teléfono DIMO
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                nombre: 'LOGISTICA INDUSTRIAL SA DE CV',
                tipo: 'CLABE',
                cuenta: '012180001234567890',
                banco: '012',
                monto: 35000,
                concepto: 'PAGO DE PROVEEDOR CLABE',
              })
            }
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
              tipoCuenta === 'CLABE'
                ? 'border-emerald-500/60 bg-emerald-950/20 shadow-sm'
                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase text-emerald-400">CLABE 18d</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">BBVA México</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">012 180 00123456789 0</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                nombre: 'FERNANDO ALVAREZ GOMEZ',
                tipo: 'PAN',
                cuenta: '4152313456789012',
                banco: '002',
                monto: 8500,
                concepto: 'LIQUIDACION TARJETA VISA',
              })
            }
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
              tipoCuenta === 'PAN' && panValue === '4152313456789012'
                ? 'border-sky-500/60 bg-sky-950/20 shadow-sm'
                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase text-sky-400">PAN 16d · Visa</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">Banamex Débito</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">4152 3134 5678 9012</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                nombre: 'MARIANA TORRES DEL VALLE',
                tipo: 'PAN',
                cuenta: '5105105105105100',
                banco: '014',
                monto: 14200,
                concepto: 'DISPERSION MASTERCARD',
              })
            }
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
              tipoCuenta === 'PAN' && panValue === '5105105105105100'
                ? 'border-amber-500/60 bg-amber-950/20 shadow-sm'
                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase text-amber-400">PAN 16d · MC</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">Santander Débito</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">5105 1051 0510 5100</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                nombre: 'RAUL SANDOVAL PEÑA',
                tipo: 'DIMO',
                cuenta: '5512345678',
                banco: '072',
                monto: 4500,
                concepto: 'PAGO MOVIL DIMO CDMX',
              })
            }
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
              tipoCuenta === 'DIMO' && dimoValue === '5512345678'
                ? 'border-violet-500/60 bg-violet-950/20 shadow-sm'
                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase text-violet-400">DIMO 10d · Celular</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">Banorte Móvil</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">(55) 1234-5678</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                nombre: 'SOFIA RAMIREZ LOZANO',
                tipo: 'DIMO',
                cuenta: '8187654321',
                banco: '659',
                monto: 18000,
                concepto: 'TRANSFERENCIA DIMO NU',
              })
            }
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
              tipoCuenta === 'DIMO' && dimoValue === '8187654321'
                ? 'border-purple-500/60 bg-purple-950/20 shadow-sm'
                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase text-purple-400">DIMO 10d · Nu</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">Nu México Móvil</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">(81) 8765-4321</div>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Form (Left) vs Real-Time Orders Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dispersal Order Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">Dispersión SPEI Interbancaria</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Protocolo Síncrono: POST a STP / Banxico con Acuse HTTP 202 (SUBMITTED)
            </p>
          </div>

          {/* HSM Pre-recorded Token Selector */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Usar Token Pre-grabado Servidor HSM</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">FIPS 140-2 Level 4</span>
            </div>
            <select
              value={selectedHsmTokenId}
              onChange={(e) => handleSelectHsmToken(e.target.value)}
              className="w-full bg-slate-950 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
            >
              <option value="">-- Ingreso manual en claro (o seleccione Token HSM) --</option>
              {hsmTokens.map((t) => (
                <option key={t.tokenId} value={t.tokenId}>
                  {t.tokenId} · {t.entityName} ({t.accountType}) · {t.maskedAccount}
                </option>
              ))}
            </select>
            {selectedHsmTokenId && (
              <div className="mt-2 text-[10px] text-indigo-300 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Token pre-validado activo: Dispersión con cero exposición de memoria en cliente.</span>
              </div>
            )}
          </div>

          {/* Security Enclave Lock Notification Banner */}
          {isLocked && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/50 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-indigo-300">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-emerald-400 border border-indigo-500/30 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Destino Asegurado por HSM</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Modificación Bloqueada
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5">
                    Token {selectedHsmTokenId || matchedHsmToken?.tokenId}: protegido contra alteraciones en memoria.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnlockFields}
                className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg text-[11px] text-indigo-200 hover:text-white font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors"
                title="Desbloquear campos para edición manual"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Desbloquear</span>
              </button>
            </div>
          )}

          {/* Account Type Selector (CLABE vs PAN vs DIMO) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Modalidad de Destino SPEI
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* CLABE 18d */}
              <button
                type="button"
                id="btn-select-clabe"
                data-testid="select-clabe"
                onClick={() => handleSelectTipoCuenta('CLABE')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  tipoCuenta === 'CLABE'
                    ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="text-xs font-bold">CLABE 18 d</span>
                <span className="text-[10px] text-slate-500 font-mono">Tipo 40 (Cuenta)</span>
              </button>

              {/* PAN 16d */}
              <button
                type="button"
                id="btn-select-pan"
                data-testid="select-pan"
                onClick={() => handleSelectTipoCuenta('PAN')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  tipoCuenta === 'PAN'
                    ? 'border-sky-500/80 bg-sky-500/10 text-sky-300 shadow-sm shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-sky-400" />
                <span className="text-xs font-bold">PAN 16 d</span>
                <span className="text-[10px] text-slate-500 font-mono">Tipo 03 (Tarjeta)</span>
              </button>

              {/* DIMO 10d */}
              <button
                type="button"
                id="btn-select-dimo"
                data-testid="select-dimo"
                onClick={() => handleSelectTipoCuenta('DIMO')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  tipoCuenta === 'DIMO'
                    ? 'border-violet-500/80 bg-violet-500/10 text-violet-300 shadow-sm shadow-violet-500/10'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1 text-violet-400" />
                <span className="text-xs font-bold">DIMO 10 d</span>
                <span className="text-[10px] text-slate-500 font-mono">Tipo 10 (Móvil)</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleDisperse} className="space-y-4 text-xs">
            {/* Beneficiary Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Nombre del Beneficiario (Persona Física o Moral)
                </label>
                {isLocked && (
                  <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Bloqueado por Enclave HSM
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isLocked}
                  name="beneficiario_nombre"
                  value={nombre}
                  onChange={(e) => !isLocked && setNombre(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg py-2 px-3 font-medium focus:outline-none uppercase ${
                    isLocked
                      ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-200 cursor-not-allowed pr-8 shadow-inner'
                      : 'border-slate-800 text-slate-100 focus:border-emerald-500'
                  }`}
                />
                {isLocked && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" title="Protegido por HSM">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>

            {/* DEDICATED INPUT SECTION ACCORDING TO DESTINATION TYPE */}

            {/* 1. CLABE Field (18 digits) */}
            {tipoCuenta === 'CLABE' && (
              <div className="space-y-2 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <label htmlFor="clabe-input" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cuenta CLABE Interbancaria (18 Dígitos)</span>
                  </label>

                  {/* Regex & Modulo 10 Validation Status */}
                  {clabeValidation.valid ? (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{clabeValidation.bankName}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{clabeValidation.error || '18 dígitos requeridos'}</span>
                    </span>
                  )}
                </div>

                {/* Masked CLABE Input */}
                <div className="relative">
                  <input
                    id="clabe-input"
                    name="clabe"
                    data-testid="clabe-input"
                    type="text"
                    required
                    readOnly={isLocked}
                    value={maskClabe(clabeValue)}
                    onChange={(e) => {
                      if (isLocked) return;
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 18);
                      setClabeValue(cleanDigits);
                    }}
                    placeholder="012 180 00123456789 0"
                    className={`w-full bg-slate-950 border rounded-lg py-2.5 px-3 font-mono text-xs focus:outline-none transition-colors tracking-wide ${
                      isLocked
                        ? 'border-indigo-500/60 bg-indigo-950/20 text-indigo-200 cursor-not-allowed pr-8 shadow-inner'
                        : clabeValidation.valid
                        ? 'border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950/40'
                        : cleanClabe.length === 18
                        ? 'border-rose-500/70 text-rose-300 bg-rose-950/10'
                        : 'border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                  {isLocked && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" title="Protegido por HSM Enclave">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* VALIDATION LAYER: Check against HSM Pre-Validated Token Registry */}
                {matchedHsmToken && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-2 text-[11px] animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-indigo-300 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white">Token HSM: {matchedHsmToken.tokenId}</span>
                        <span className="text-slate-400 block text-[10px] truncate">
                          {matchedHsmToken.entityName} · {matchedHsmToken.complianceTier}
                        </span>
                      </div>
                    </div>
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectHsmToken(matchedHsmToken.tokenId)}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded text-indigo-200 font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition-colors text-[10px]"
                      >
                        <Lock className="w-3 h-3 text-indigo-300" />
                        <span>Vincular &amp; Bloquear</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Enclave Bloqueado
                      </span>
                    )}
                  </div>
                )}

                {/* Regex & Structure Diagnostic Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
                      isClabeRegexValid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {isClabeRegexValid ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                      Regex: ^\d&#123;18&#125;$ ({isClabeRegexValid ? 'Válido' : 'Incompleto'})
                    </span>
                    <span className="text-slate-500">Módulo 10 Banxico</span>
                  </div>

                  <div className="font-mono flex items-center gap-1.5">
                    <span className="text-slate-500">Dígitos:</span>
                    <span className={`font-bold ${cleanClabe.length === 18 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {cleanClabe.length} / 18 d
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PAN Field (16-digit card number) */}
            {tipoCuenta === 'PAN' && (
              <div className="space-y-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-sky-900/40 shadow-sm shadow-sky-950/30">
                <div className="flex justify-between items-center">
                  <label htmlFor="pan-input" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                    <span>Número de Tarjeta PAN (16 Dígitos)</span>
                  </label>

                  {/* PAN Card Brand & Validation Status */}
                  {panValidation.valid ? (
                    <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      {panValidation.cardBrand && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          panValidation.cardBrand === 'VISA'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : panValidation.cardBrand === 'MASTERCARD'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {panValidation.cardBrand}
                        </span>
                      )}
                      <span>Luhn Válido</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{panValidation.error || '16 dígitos requeridos'}</span>
                    </span>
                  )}
                </div>

                {/* Masked PAN Input */}
                <div className="relative">
                  <input
                    id="pan-input"
                    name="pan"
                    data-testid="pan-input"
                    type="text"
                    required
                    readOnly={isLocked}
                    value={maskPan(panValue)}
                    onChange={(e) => {
                      if (isLocked) return;
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setPanValue(cleanDigits);
                    }}
                    placeholder="4152 3134 5678 9012"
                    className={`w-full bg-slate-950 border rounded-lg py-2.5 px-3 font-mono text-xs focus:outline-none transition-colors tracking-wide ${
                      isLocked
                        ? 'border-indigo-500/60 bg-indigo-950/20 text-indigo-200 cursor-not-allowed pr-8 shadow-inner'
                        : panValidation.valid
                        ? 'border-sky-500/70 text-sky-300 shadow-sm shadow-sky-950/40'
                        : cleanPan.length === 16
                        ? 'border-rose-500/70 text-rose-300 bg-rose-950/10'
                        : 'border-slate-800 text-slate-100 focus:border-sky-500'
                    }`}
                  />
                  {isLocked && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" title="Protegido por HSM Enclave">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* VALIDATION LAYER: Check against HSM Pre-Validated Token Registry */}
                {matchedHsmToken && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-2 text-[11px] animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-indigo-300 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white">Token HSM: {matchedHsmToken.tokenId}</span>
                        <span className="text-slate-400 block text-[10px] truncate">
                          {matchedHsmToken.entityName} · {matchedHsmToken.complianceTier}
                        </span>
                      </div>
                    </div>
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectHsmToken(matchedHsmToken.tokenId)}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded text-indigo-200 font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition-colors text-[10px]"
                      >
                        <Lock className="w-3 h-3 text-indigo-300" />
                        <span>Vincular &amp; Bloquear</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Enclave Bloqueado
                      </span>
                    )}
                  </div>
                )}

                {/* Regex & Luhn Diagnostic Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
                      isPanRegexValid ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {isPanRegexValid ? <CheckCheck className="w-3 h-3 text-sky-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                      Regex: ^\d&#123;16&#125;$ ({isPanRegexValid ? 'Válido' : 'Incompleto'})
                    </span>
                    <span className="text-slate-500">ISO/IEC 7812 Luhn</span>
                  </div>

                  <div className="font-mono flex items-center gap-1.5">
                    <span className="text-slate-500">Dígitos:</span>
                    <span className={`font-bold ${cleanPan.length === 16 ? 'text-sky-400' : 'text-amber-400'}`}>
                      {cleanPan.length} / 16 d
                    </span>
                  </div>
                </div>

                {/* Bank Selector for PAN Destination */}
                <div className="pt-2">
                  <label htmlFor="pan-bank-select" className="text-[11px] font-medium text-slate-300 block mb-1">
                    Institución Bancaria Emisora de la Tarjeta (BIN)
                  </label>
                  <select
                    id="pan-bank-select"
                    name="pan_bank"
                    disabled={isLocked}
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    className={`w-full bg-slate-950 border text-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none ${
                      isLocked
                        ? 'border-indigo-500/30 opacity-70 cursor-not-allowed'
                        : 'border-slate-800 focus:border-sky-500 cursor-pointer'
                    }`}
                  >
                    {Object.entries(MEXICAN_BANKS).map(([code, bName]) => (
                      <option key={code} value={code}>
                        {bName} ({code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 3. DIMO Field (10-digit cellphone identifier) */}
            {tipoCuenta === 'DIMO' && (
              <div className="space-y-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-violet-900/40 shadow-sm shadow-violet-950/30">
                <div className="flex justify-between items-center">
                  <label htmlFor="dimo-input" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                    <span>Número Telefónico Celular DIMO (10 Dígitos)</span>
                  </label>

                  {/* DIMO Validation Status */}
                  {dimoValidation.valid ? (
                    <span className="text-[11px] font-semibold text-violet-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                      <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded text-[10px] font-bold border border-violet-500/40">
                        DIRECTORIO DIMO
                      </span>
                      <span>{dimoValidation.bankName}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{dimoValidation.error || '10 dígitos requeridos'}</span>
                    </span>
                  )}
                </div>

                {/* Masked DIMO Input */}
                <div className="relative">
                  <input
                    id="dimo-input"
                    name="dimo"
                    data-testid="dimo-input"
                    type="text"
                    required
                    readOnly={isLocked}
                    value={maskDimo(dimoValue)}
                    onChange={(e) => {
                      if (isLocked) return;
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setDimoValue(cleanDigits);
                    }}
                    placeholder="(55) 1234-5678"
                    className={`w-full bg-slate-950 border rounded-lg py-2.5 px-3 font-mono text-xs focus:outline-none transition-colors tracking-wide ${
                      isLocked
                        ? 'border-indigo-500/60 bg-indigo-950/20 text-indigo-200 cursor-not-allowed pr-8 shadow-inner'
                        : dimoValidation.valid
                        ? 'border-violet-500/70 text-violet-300 shadow-sm shadow-violet-950/40'
                        : cleanDimo.length === 10
                        ? 'border-rose-500/70 text-rose-300 bg-rose-950/10'
                        : 'border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  />
                  {isLocked && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" title="Protegido por HSM Enclave">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* VALIDATION LAYER: Check against HSM Pre-Validated Token Registry */}
                {matchedHsmToken && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-2 text-[11px] animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-indigo-300 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white">Token HSM: {matchedHsmToken.tokenId}</span>
                        <span className="text-slate-400 block text-[10px] truncate">
                          {matchedHsmToken.entityName} · {matchedHsmToken.complianceTier}
                        </span>
                      </div>
                    </div>
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectHsmToken(matchedHsmToken.tokenId)}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded text-indigo-200 font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition-colors text-[10px]"
                      >
                        <Lock className="w-3 h-3 text-indigo-300" />
                        <span>Vincular &amp; Bloquear</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Enclave Bloqueado
                      </span>
                    )}
                  </div>
                )}

                {/* Regex & National Lada Diagnostic Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
                      isDimoRegexValid ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {isDimoRegexValid ? <CheckCheck className="w-3 h-3 text-violet-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                      Regex: ^\d&#123;10&#125;$ ({isDimoRegexValid ? 'Válido' : 'Incompleto'})
                    </span>
                    <span className="text-slate-500">Lada Nacional 2-9</span>
                  </div>

                  <div className="font-mono flex items-center gap-1.5">
                    <span className="text-slate-500">Dígitos:</span>
                    <span className={`font-bold ${cleanDimo.length === 10 ? 'text-violet-400' : 'text-amber-400'}`}>
                      {cleanDimo.length} / 10 d
                    </span>
                  </div>
                </div>

                {/* Bank Selector for DIMO Destination */}
                <div className="pt-2">
                  <label htmlFor="dimo-bank-select" className="text-[11px] font-medium text-slate-300 block mb-1">
                    Institución Receptora Vinculada en DIMO
                  </label>
                  <select
                    id="dimo-bank-select"
                    name="dimo_bank"
                    disabled={isLocked}
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    className={`w-full bg-slate-950 border text-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none ${
                      isLocked
                        ? 'border-indigo-500/30 opacity-70 cursor-not-allowed'
                        : 'border-slate-800 focus:border-violet-500 cursor-pointer'
                    }`}
                  >
                    {Object.entries(MEXICAN_BANKS).map(([code, bName]) => (
                      <option key={code} value={code}>
                        {bName} ({code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* RFC / CURP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  RFC o CURP del Beneficiario (Opcional para CEP Banxico)
                </label>
                {isLocked && (
                  <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Bloqueado HSM
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="rfc_curp"
                  maxLength={18}
                  readOnly={isLocked}
                  value={rfc}
                  onChange={(e) => !isLocked && setRfc(e.target.value.toUpperCase())}
                  className={`w-full bg-slate-950 border rounded-lg py-2 px-3 font-mono text-xs focus:outline-none uppercase ${
                    isLocked
                      ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-200 cursor-not-allowed pr-8 shadow-inner'
                      : 'border-slate-800 text-slate-200 focus:border-emerald-500'
                  }`}
                />
                {isLocked && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" title="Protegido por HSM Enclave">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>

            {/* Amount MXN & USD */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Monto en MXN
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    name="monto_mxn"
                    value={montoMxn}
                    onChange={(e) => setMontoMxn(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-7 pr-3 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Equivalente en USD
                </label>
                <div className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300">
                  ${montoUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </div>
              </div>
            </div>

            {/* Concepto de Pago */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Concepto de Pago (Máx 40 caracteres)
              </label>
              <input
                type="text"
                maxLength={40}
                required
                name="concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Clave de Rastreo (Idempotencia) */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-300">
                  Clave de Rastreo (Idempotency Key)
                </span>
                <button
                  type="button"
                  onClick={() => setClaveRastreo(generateClaveRastreo('DASP'))}
                  className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Regenerar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="clave_rastreo"
                  maxLength={30}
                  required
                  value={claveRastreo}
                  onChange={(e) => setClaveRastreo(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded py-1 px-2 font-mono text-[11px] text-amber-300 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Garantiza que un reintento por timeout no duplique el cargo en la cuenta ordenante.
              </p>
            </div>

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !activeValidation.valid || !activeRegexValid}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 font-bold text-xs rounded-lg transition-all ${
                activeValidation.valid && activeRegexValid && !loading
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70 border border-slate-700/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? 'Transmitiendo a SPEI...'
                  : activeValidation.valid && activeRegexValid
                  ? `Liberar Dispersión ${tipoCuenta} (POST Síncrono 202)`
                  : `Complete ${tipoCuenta} con formato regex válido para continuar`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: SPEI Orders Real-Time Ledger & Webhook Testing */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Bitácora de Órdenes SPEI ({orders.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Liquidación multicanal: CLABE (18d), Tarjeta PAN (16d) y Celular DIMO (10d)
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-amber-400">
                  {orders.filter((o) => o.status === 'SUBMITTED').length} en tránsito
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400">
                  {orders.filter((o) => o.status === 'LIQUIDATED').length} liquidadas
                </span>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No hay órdenes SPEI registradas en la memoria del servidor.
                </div>
              ) : (
                orders.map((order) => {
                  const isSubmitted = order.status === 'SUBMITTED';
                  const isLiquidated = order.status === 'LIQUIDATED';
                  const isRejected = order.status === 'REJECTED';
                  const orderTipo = order.beneficiario.tipo_cuenta || 'CLABE';
                  const displayAccount =
                    order.beneficiario.cuenta || order.beneficiario.clabe || '';

                  // Format account for display
                  let formattedAccount = displayAccount;
                  if (orderTipo === 'PAN' && displayAccount.length === 16) {
                    formattedAccount = `${displayAccount.slice(0, 4)} •••• •••• ${displayAccount.slice(12)}`;
                  } else if (orderTipo === 'DIMO' && displayAccount.length === 10) {
                    formattedAccount = `(${displayAccount.slice(0, 2)}) ••••-${displayAccount.slice(6)}`;
                  } else if (orderTipo === 'CLABE' && displayAccount.length === 18) {
                    formattedAccount = `${displayAccount.slice(0, 3)} •••• ••••••• ${displayAccount.slice(14)}`;
                  }

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
                        isLiquidated
                          ? 'bg-slate-950/80 border-slate-800'
                          : isSubmitted
                          ? 'bg-amber-950/10 border-amber-500/30'
                          : 'bg-rose-950/10 border-rose-500/30'
                      }`}
                    >
                      {/* Top Row: Beneficiary, Account Type Badge & Amount */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {order.beneficiario.nombre}
                            </span>
                            {/* Account Type Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                orderTipo === 'CLABE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : orderTipo === 'PAN'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                              }`}
                            >
                              {orderTipo}
                              {orderTipo === 'PAN' && order.beneficiario.marca_tarjeta && ` · ${order.beneficiario.marca_tarjeta}`}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span>{order.beneficiario.banco}</span>
                            <span className="text-slate-600">·</span>
                            <span>{formattedAccount}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold font-mono text-base text-white tabular-nums">
                            ${order.monto_mxn.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ~${order.monto_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Clave de Rastreo & Concepto */}
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Clave de Rastreo:</span>
                          <span className="text-amber-300 font-semibold">{order.clave_rastreo}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.clave_rastreo)}
                            className="hover:text-white text-slate-400 cursor-pointer ml-1"
                            title="Copiar Clave de Rastreo"
                          >
                            {copiedClave === order.clave_rastreo ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <div className="text-slate-400">
                          Concepto: <span className="text-slate-200">{order.concepto}</span>
                        </div>
                      </div>

                      {/* Bottom Row: Status Badge & Webhook Simulation Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                              isLiquidated
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isSubmitted
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {isLiquidated && <CheckCircle2 className="w-3 h-3" />}
                            {isSubmitted && <Clock className="w-3 h-3 animate-spin" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            {order.status}
                          </span>

                          {isLiquidated && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* View CEP button that generates downloadable PDF receipt using jsPDF and opens viewer */}
                              <button
                                type="button"
                                data-testid="view-cep-button"
                                onClick={() => {
                                  downloadBanxicoCepPdf(order);
                                  setSelectedCepOrder(order);
                                }}
                                className="text-[11px] text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded px-2.5 py-1 inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-sm shadow-emerald-950/40"
                                title="View CEP (Comprobante Electrónico de Pago) - Genera y descarga el comprobante oficial en PDF con jsPDF conforme a estándares Banxico"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>View CEP</span>
                              </button>

                              {/* Direct PDF Download button */}
                              <button
                                type="button"
                                data-testid="download-cep-pdf-button"
                                onClick={() => downloadBanxicoCepPdf(order)}
                                className="text-[11px] text-sky-300 hover:text-white bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 rounded px-2 py-1 inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                title="Descargar comprobante PDF generado con jsPDF para trazabilidad fiscal"
                              >
                                <Download className="w-3 h-3 text-sky-400" />
                                <span>PDF CEP</span>
                              </button>
                            </div>
                          )}

                          {order.motivo_rechazo && (
                            <span className="text-[11px] text-rose-300">
                              {order.motivo_rechazo}
                            </span>
                          )}
                        </div>

                        {/* Interactive Webhook Simulator Buttons if in SUBMITTED */}
                        {isSubmitted && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSimulateWebhook(order, 'LIQUIDATED')}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Simular recepción de webhook de éxito firmado con HMAC"
                            >
                              Simular Webhook LIQUIDATED
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSimulateWebhook(order, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Simular webhook de devolución por número o cuenta inexistente"
                            >
                              Simular Rechazo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* In-App Official Banxico CEP Modal Viewer */}
      {selectedCepOrder && (
        <BanxicoCepModal
          order={selectedCepOrder}
          onClose={() => setSelectedCepOrder(null)}
        />
      )}
    </div>
  );
};

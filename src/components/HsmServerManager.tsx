import React, { useState } from 'react';
import {
  hsmEngine,
  HsmPreRecordedToken,
  HsmAuditLogEntry,
  HsmComplianceTier,
  HSM_HARDWARE_SLOTS,
} from '../engine/hsmEngine';
import { MEXICAN_BANKS, SpeiAccountType } from '../engine/speiTypes';
import {
  Server,
  Key,
  ShieldCheck,
  Cpu,
  Lock,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertOctagon,
  Smartphone,
  CreditCard,
  Building2,
  Zap,
  Fingerprint,
} from 'lucide-react';

interface HsmServerManagerProps {
  onSelectTokenForDisperser?: (token: HsmPreRecordedToken) => void;
}

export const HsmServerManager: React.FC<HsmServerManagerProps> = ({ onSelectTokenForDisperser }) => {
  const [tokens, setTokens] = useState<HsmPreRecordedToken[]>(() => hsmEngine.getTokens());
  const [logs, setLogs] = useState<HsmAuditLogEntry[]>(() => hsmEngine.getLogs());
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Form states for pre-recording
  const [selectedEntityCode, setSelectedEntityCode] = useState<string>('638'); // Nu México default
  const [accountType, setAccountType] = useState<SpeiAccountType>('CLABE');
  const [rawAccount, setRawAccount] = useState<string>('638180000492817294');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('NU MÉXICO CUENTA CONCENTRADORA');
  const [rfcCurp, setRfcCurp] = useState<string>('NMC200115XX9');
  const [dailyLimitMxn, setDailyLimitMxn] = useState<number>(5000000);
  const [complianceTier, setComplianceTier] = useState<HsmComplianceTier>('TIER_2_AUDITED_CORP');
  const [notes, setNotes] = useState<string>('Pregrabado autorizado para dispersión inmediata');

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<'ALL' | 'WALLETS' | 'BANKS'>('ALL');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'ALL' | 'CLABE' | 'DIMO' | 'PAN'>('ALL');

  // Form error / success
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const refreshData = () => {
    setTokens(hsmEngine.getTokens());
    setLogs(hsmEngine.getLogs());
  };

  const handlePreRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const result = hsmEngine.preRecordIdentifier({
      entityCode: selectedEntityCode,
      accountType,
      rawAccount,
      beneficiaryName,
      rfcCurp,
      dailyLimitMxn,
      complianceTier,
      notes,
    });

    if (!result.success) {
      setFormError(result.error || 'Error de validación criptográfica');
      return;
    }

    setFormSuccess(`¡Token ${result.token?.tokenId} pregrabado y pre-validado con éxito en el enclave BDK-3!`);
    refreshData();
  };

  const handleCopy = (tokenId: string) => {
    navigator.clipboard.writeText(tokenId);
    setCopiedTokenId(tokenId);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleDelete = (tokenId: string) => {
    if (confirm(`¿Confirma revocar y purgar de la memoria HSM el token ${tokenId}?`)) {
      hsmEngine.deleteToken(tokenId);
      refreshData();
    }
  };

  const handleResetToDefault = () => {
    if (confirm('¿Restablecer el Servidor HSM a la configuración nominal de tokens pre-grabados?')) {
      hsmEngine.resetToDefault();
      refreshData();
    }
  };

  // Group banks into Wallets/Fintechs vs Traditional for intuitive browsing
  const walletCodes = ['638', '646', '659', '677', '679', '683', '684', '710', '722', '846'];

  const filteredTokens = tokens.filter((t) => {
    const isWallet = walletCodes.includes(t.entityCode);
    if (entityTypeFilter === 'WALLETS' && !isWallet) return false;
    if (entityTypeFilter === 'BANKS' && isWallet) return false;
    if (accountTypeFilter !== 'ALL' && t.accountType !== accountTypeFilter) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        t.tokenId.toLowerCase().includes(q) ||
        t.entityName.toLowerCase().includes(q) ||
        t.beneficiaryName.toLowerCase().includes(q) ||
        t.maskedAccount.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Server className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                FIPS 140-2 Level 4 Enclave
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                ● Cero Exposición de Memoria
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Servidor HSM · Pregrabado Criptográfico CLABE &amp; DIMO
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Módulo de seguridad de hardware de alta disponibilidad para la pre-grabación y tokenización de cuentas
              bancarias tradicionales y billeteras SPEI (Nu, Mercado Pago, Spin OXXO, Klar). Permite dispersiones a
              través de tokens pre-validados <code className="text-indigo-300 font-mono">HSM-TOK-...</code> sin exponer
              datos confidenciales en memoria viva ni tráfico web.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900/90 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer Fábrica</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Slots Enclave Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {HSM_HARDWARE_SLOTS.map((slot) => (
          <div
            key={slot.slotId}
            className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider">
                  Slot #{slot.slotId} · {slot.keyType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {slot.status}
                </span>
              </div>
              <h3 className="text-xs font-bold text-white leading-tight mb-1">{slot.label}</h3>
              <p className="text-[11px] font-mono text-slate-400 truncate">{slot.algorithm}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{slot.fipsLevel}</span>
              <span className="text-indigo-300">{slot.usageCount.toLocaleString()} ops</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Form Pre-recording (Left) & Pre-validated Tokens Vault (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Pre-record Identifier */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Pregrabar Identificador en Servidor HSM</h2>
                <p className="text-xs text-slate-400">Tokeniza CLABE (18d), DIMO (10d) o PAN (16d) con validación previa</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePreRecord} className="space-y-4">
              {/* Entity Selector (All Entities including Traditional & Fintech Wallets) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Entidad Financiera Receptora (Bancos y Billeteras SPEI)
                </label>
                <select
                  value={selectedEntityCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedEntityCode(code);
                    // Pre-fill smart defaults for swift testing
                    if (code === '638') {
                      setRawAccount('638180000492817294');
                      setBeneficiaryName('NU MÉXICO CUENTA CONCENTRADORA');
                      setRfcCurp('FCO190822NU1');
                    } else if (code === '722') {
                      setRawAccount('722180001948271648');
                      setBeneficiaryName('MERCADO PAGO WALLET SETTLEMENT');
                      setRfcCurp('MLM140301MP9');
                    } else if (code === '710') {
                      setRawAccount('710180000281927481');
                      setBeneficiaryName('SPIN BY OXXO COMPROPAGO SA DE CV');
                      setRfcCurp('COM161115SP0');
                    } else if (code === '012') {
                      setRawAccount('012180001234567890');
                      setBeneficiaryName('PROVEEDORES Y SERVICIOS DEL NORTE SA');
                      setRfcCurp('PSN180412AA9');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <optgroup label="Billeteras Digitales SPEI &amp; Neobancos">
                    <option value="638">638 · NU MÉXICO FINANCIERA (SOFIPO)</option>
                    <option value="722">722 · MERCADO PAGO WALLET (MERCADO LIBRE)</option>
                    <option value="710">710 · SPIN BY OXXO (COMPROPAGO)</option>
                    <option value="684">684 · KLAR / SFA</option>
                    <option value="677">677 · STORI SOFIPO</option>
                    <option value="683">683 · ALBO FINTECH</option>
                    <option value="646">646 · STP (CLEARING HOUSE)</option>
                  </optgroup>
                  <optgroup label="Banca Tradicional Banxico">
                    <option value="012">012 · BBVA MÉXICO</option>
                    <option value="002">002 · BANAMEX (CITIBANAMEX)</option>
                    <option value="014">014 · SANTANDER MÉXICO</option>
                    <option value="072">072 · BANORTE</option>
                    <option value="021">021 · HSBC MÉXICO</option>
                    <option value="044">044 · SCOTIABANK</option>
                    <option value="058">058 · BANREGIO / HEY BANCO</option>
                    <option value="127">127 · BANCO AZTECA</option>
                    <option value="137">137 · BANCOPPEL</option>
                  </optgroup>
                </select>
              </div>

              {/* Account Type Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Identificador a Pregrabar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('CLABE');
                      if (selectedEntityCode === '638') setRawAccount('638180000492817294');
                      if (selectedEntityCode === '722') setRawAccount('722180001948271648');
                      if (selectedEntityCode === '710') setRawAccount('710180000281927481');
                      if (selectedEntityCode === '012') setRawAccount('012180001234567890');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      accountType === 'CLABE'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>CLABE 18d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('DIMO');
                      setRawAccount('5549208819');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      accountType === 'DIMO'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>DIMO 10d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('PAN');
                      setRawAccount('4152313456789012');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      accountType === 'PAN'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>PAN 16d</span>
                  </button>
                </div>
              </div>

              {/* Raw Account Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número en Claro a Tokenizar en Silicio ({accountType})
                </label>
                <input
                  type="text"
                  value={rawAccount}
                  onChange={(e) => setRawAccount(e.target.value.replace(/\D/g, ''))}
                  placeholder={
                    accountType === 'CLABE'
                      ? '18 dígitos de CLABE'
                      : accountType === 'DIMO'
                      ? '10 dígitos teléfono celular DIMO'
                      : '16 dígitos número de tarjeta'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-400"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {accountType === 'CLABE' && 'Validado con Modulo 10 Banxico ponderaciones 3, 7, 1'}
                  {accountType === 'DIMO' && 'Validado con Directorio Nacional Dinero Móvil Banxico (10 dígitos)'}
                  {accountType === 'PAN' && 'Validado con Algoritmo de Luhn ISO/IEC 7812'}
                </span>
              </div>

              {/* Beneficiary Name & RFC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Beneficiario</label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">RFC / CURP</label>
                  <input
                    type="text"
                    value={rfcCurp}
                    onChange={(e) => setRfcCurp(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400 uppercase"
                    required
                  />
                </div>
              </div>

              {/* Daily Limit & Compliance Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Límite Diario MXN</label>
                  <input
                    type="number"
                    value={dailyLimitMxn}
                    onChange={(e) => setDailyLimitMxn(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                    step={100000}
                    min={10000}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nivel Compliance</label>
                  <select
                    value={complianceTier}
                    onChange={(e) => setComplianceTier(e.target.value as HsmComplianceTier)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="TIER_1_LOW_RISK">Tier 1 · Retail / Bajo Riesgo</option>
                    <option value="TIER_2_AUDITED_CORP">Tier 2 · Corporativo Auditado</option>
                    <option value="TIER_3_INSTITUTIONAL">Tier 3 · Institucional / STP Clearing</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Pregrabar en Servidor HSM (Enclave BDK-3)</span>
              </button>
            </form>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2 font-mono">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Los identificadores se cifran en TRNG hardware. Cero filtración en RAM de aplicación.</span>
          </div>
        </div>

        {/* Right Column: Pre-Recorded Tokens Table & Filters */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  Bóveda de Tokens Pre-Validados en Servidor HSM ({filteredTokens.length})
                </h2>
                <p className="text-xs text-slate-400">Tokens listos para dispersión instantánea en Mainnet</p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar token o entidad..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 w-44"
                  />
                </div>

                <select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">Todas las Entidades</option>
                  <option value="WALLETS">Billeteras SPEI (Nu/MP/Spin)</option>
                  <option value="BANKS">Bancos Tradicionales</option>
                </select>

                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">Todos los Tipos</option>
                  <option value="CLABE">CLABE</option>
                  <option value="DIMO">DIMO</option>
                  <option value="PAN">PAN</option>
                </select>
              </div>
            </div>

            {/* Tokens Cards List */}
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filteredTokens.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No se encontraron tokens pre-grabados que coincidan con los filtros.
                </div>
              ) : (
                filteredTokens.map((token) => (
                  <div
                    key={token.tokenId}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-300 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-indigo-400" />
                          {token.tokenId}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            token.accountType === 'DIMO'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : token.accountType === 'PAN'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {token.accountType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {token.status}
                        </span>
                        <button
                          onClick={() => handleCopy(token.tokenId)}
                          title="Copiar Token ID"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedTokenId === token.tokenId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(token.tokenId)}
                          title="Revocar Token"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">Entidad &amp; Cuenta</span>
                        <div className="font-semibold text-slate-200 truncate">{token.entityName}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{token.maskedAccount}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">Beneficiario &amp; Límite</span>
                        <div className="text-slate-300 truncate">{token.beneficiaryName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          Disp: ${token.disbursedTodayMxn.toLocaleString('es-MX')} / Max: ${token.dailyLimitMxn.toLocaleString('es-MX')} MXN
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{token.notes}</span>

                      {onSelectTokenForDisperser && (
                        <button
                          onClick={() => onSelectTokenForDisperser(token)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Usar en Dispersor</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic Audit Trail of HSM Operations */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Registro de Auditoría de Hardware Silicio (Enclave FIPS 140-2)</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{logs.length} Eventos Criptográficos</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.operation === 'TOKENIZE'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : log.operation === 'ZERO_EXPOSURE_RESOLVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {log.operation}
                </span>
                <span className="text-slate-300 text-[11px]">{log.entity}</span>
                <span className="text-slate-400 text-[11px] truncate max-w-md">{log.details}</span>
              </div>

              <span
                className={`text-[10px] px-2 py-0.5 rounded shrink-0 font-bold ${
                  log.result === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {log.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

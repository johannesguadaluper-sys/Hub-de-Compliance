import React, { useState } from 'react';
import {
  webhookTurboEngine,
  TurboWebhookEvent,
  QuarantinedEndpoint,
  WebhookTurboStats,
} from '../engine/webhookTurboEngine';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
  Radio,
  Lock,
  Flame,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Bug,
} from 'lucide-react';

export const WebhookTurboMonitor: React.FC = () => {
  const [events, setEvents] = useState<TurboWebhookEvent[]>(() => webhookTurboEngine.getEvents());
  const [quarantined, setQuarantined] = useState<QuarantinedEndpoint[]>(() => webhookTurboEngine.getQuarantined());
  const [stats, setStats] = useState<WebhookTurboStats>(() => webhookTurboEngine.getStats());
  const [simulationResult, setSimulationResult] = useState<{
    threat?: string;
    defense: string;
    type: 'SUCCESS' | 'BLOCKED_ATTACK';
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshAll = () => {
    setEvents(webhookTurboEngine.getEvents());
    setQuarantined(webhookTurboEngine.getQuarantined());
    setStats(webhookTurboEngine.getStats());
  };

  const handleSimulate = (scenario: 'MEMORY_HOOK' | 'REPLAY_ATTACK' | 'PAYLOAD_TAMPERING' | 'CLEAN_TURBO') => {
    const res = webhookTurboEngine.simulateAttack(scenario);
    refreshAll();
    setSimulationResult({
      threat: res.detectedThreat,
      defense: res.defenseAction,
      type: scenario === 'CLEAN_TURBO' ? 'SUCCESS' : 'BLOCKED_ATTACK',
    });
  };

  const handleReleaseQuarantine = (id: string) => {
    webhookTurboEngine.releaseQuarantine(id);
    refreshAll();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame className="w-48 h-48 text-amber-400" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-400/30 text-amber-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Pipeline Webhook Turbo
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Sistema Anti-Hooking Activo
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Webhook Turbo &amp; Motor Anti-Hooking Criptográfico
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Despacho paralelo ultra-rápido en sub-3ms con protección contra hooks de memoria (Frida / eBPF / ptrace),
              supresión de repeticiones en ventana deslizante sub-500ms y validación criptográfica HMAC-SHA512 respaldada
              por tokens de hardware HSM.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                webhookTurboEngine.clearAll();
                refreshAll();
                setSimulationResult(null);
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Historial</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Latencia Media Turbo</span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{stats.averageLatencyMs} ms</div>
            <span className="text-[10px] text-emerald-400 font-mono">Despacho asíncrono no-bloqueante</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Integridad Anti-Hook</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.integrityScorePercent}%</div>
            <span className="text-[10px] text-slate-400 font-mono">HMAC-SHA512 Timing-Safe</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Ataques Neutralizados</span>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.blockedHookAttempts}</div>
            <span className="text-[10px] text-rose-400 font-mono">Ventana &lt;500ms + Memory traps</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Endpoints en Cuarentena</span>
            <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{stats.quarantinedEndpointsCount}</div>
            <span className="text-[10px] text-indigo-400 font-mono">Circuit breaker auto-activado</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Anti-Hooking & Attack Sandbox */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-400" />
              Simulador de Amenazas y Verificación de Blindaje Anti-Hooking
            </h2>
            <p className="text-xs text-slate-400">
              Inyecte ataques reales para comprobar cómo el motor reacciona en tiempo de ejecución sin suspender el servicio
            </p>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleSimulate('CLEAN_TURBO')}
            className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400">Despacho Turbo Normal</span>
              <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Despacho limpio en 1.8ms con nonce de silicio y firma HMAC-SHA512.
            </p>
          </button>

          <button
            onClick={() => handleSimulate('MEMORY_HOOK')}
            className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 hover:border-rose-500/60 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-400">Hooking de Memoria</span>
              <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Inyección simulada de Frida/ptrace en memoria viva para interceptar llaves.
            </p>
          </button>

          <button
            onClick={() => handleSimulate('REPLAY_ATTACK')}
            className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-400">Ataque de Replay</span>
              <RotateCcw className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Re-envío de webhook expirado (&gt;500ms) o nonce duplicado.
            </p>
          </button>

          <button
            onClick={() => handleSimulate('PAYLOAD_TAMPERING')}
            className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-400">Falsificación MITM</span>
              <Lock className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Alteración de monto o estado en tránsito. Verificación SHA-512 descalificada.
            </p>
          </button>
        </div>

        {/* Live Simulation Banner Result */}
        {simulationResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
              simulationResult.type === 'SUCCESS'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {simulationResult.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              {simulationResult.threat && (
                <div className="font-bold uppercase tracking-wider mb-0.5">{simulationResult.threat}</div>
              )}
              <div className="leading-relaxed">{simulationResult.defense}</div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Webhook Turbo Pipeline Live Feed (8 cols) & Quarantined Endpoints (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dispatches Feed */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Flujo de Despacho Webhook Turbo en Vivo ({events.length})
              </h2>
              <p className="text-xs text-slate-400">Verificaciones criptográficas de hardware y latencias sub-3ms</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all font-mono text-xs flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{evt.clave_rastreo}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        evt.eventType === 'LIQUIDATED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ⚡ {evt.dispatchLatencyMs} ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        evt.antiHookingStatus === 'VERIFIED_CLEAN'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {evt.antiHookingStatus}
                    </span>
                    <span className="text-[11px] text-slate-500">HTTP {evt.httpStatusAck}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 truncate mb-2">
                  Destino: <span className="text-slate-300">{evt.targetEndpoint}</span>
                </div>

                <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div>
                    <span className="text-slate-400">Token HSM: </span>
                    <span className="text-indigo-300">{evt.hardwareTokenId}</span>
                  </div>
                  <div className="truncate flex items-center justify-between">
                    <span className="truncate">HMAC-SHA512: {evt.hmacSignatureSha512.slice(0, 24)}...</span>
                    <button
                      onClick={() => handleCopy(evt.hmacSignatureSha512, evt.id)}
                      className="ml-1 p-0.5 text-slate-400 hover:text-white"
                      title="Copiar firma SHA-512"
                    >
                      {copiedId === evt.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quarantined Endpoints Sandbox */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Endpoints Hostiles en Cuarentena</h2>
                <p className="text-xs text-slate-400">Bloqueo perimetral y circuit breaker automático</p>
              </div>
            </div>

            <div className="space-y-3">
              {quarantined.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No hay endpoints en cuarentena activa en este momento.
                </div>
              ) : (
                quarantined.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border text-xs ${
                      q.active
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold uppercase text-rose-400">
                        {q.detectedThreat}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{q.blockedAttempts} bloqueos</span>
                    </div>

                    <div className="font-mono text-[11px] text-white truncate mb-1">{q.endpointUrl}</div>
                    <p className="text-[11px] text-slate-400 leading-snug">{q.reason}</p>

                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-500">{new Date(q.quarantinedAt).toLocaleTimeString()}</span>
                      {q.active ? (
                        <button
                          onClick={() => handleReleaseQuarantine(q.id)}
                          className="px-2 py-0.5 rounded text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          Levantar Cuarentena
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">Levantado</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ventana de repetición calibrada en 500ms contra ataques de replicación SPEI.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

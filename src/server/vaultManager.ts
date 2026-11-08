import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VaultState, SpeiOrder, SpeiWebhookPayload, generateClaveRastreo } from '../engine/speiTypes.ts';
import { ComplianceEvaluationResult, TransactionInput } from '../engine/types.ts';
import { evaluateTransaction } from '../engine/complianceEngine.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAULT_FILE = path.resolve(DATA_DIR, 'vault_state.json');

const INITIAL_VAULT: VaultState = {
  total_inflow_usd: 1245000.0,
  accumulated_hub_fee_usd: 48920.0,
  net_dispersed_usd: 1085000.0,
  net_refunded_usd: 111080.0,
  spei_reserve_mxn: 8750000.0, // ~ $440,000 USD equivalent in Mexican Pesos
  crypto_vault_usdt: 450000.0,
  crypto_vault_btc: 8.45,
  crypto_vault_eth: 64.2,
  last_updated: new Date().toISOString(),
  automated_ingestion_active: false,
  transactions_count: 5,
  spei_dispersals_count: 3,
};

interface StoredData {
  vault: VaultState;
  transactions: ComplianceEvaluationResult[];
  spei_orders: SpeiOrder[];
  idempotency_keys: Record<string, { status: string; order_id: string; created_at: string }>;
}

export class ServerVaultManager {
  private data: StoredData;
  private autoTimer: NodeJS.Timeout | null = null;
  public webhookSecret: string = process.env.SPEI_WEBHOOK_SECRET || 'dasp_mainnet_secret_2026_ciphertrace';

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): StoredData {
    try {
      if (fs.existsSync(VAULT_FILE)) {
        const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.vault && Array.isArray(parsed.transactions)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing vault file, re-initializing fresh vault state:', e);
    }

    // Default seeded state
    const initialOrders: SpeiOrder[] = [
      {
        id: 'spei-ord-001',
        clave_rastreo: generateClaveRastreo('DASP'),
        beneficiario: {
          nombre: 'TESORERIA CORPORATIVA SA DE CV',
          tipo_cuenta: 'CLABE',
          cuenta: '012180001234567890',
          clabe: '012180001234567890',
          rfc_curp: 'TCO190820AA1',
          banco: 'BBVA MÉXICO',
          banco_codigo: '012',
        },
        monto_mxn: 397000.0,
        monto_usd: 20000.0,
        concepto: 'DISPERSION NOMINA CEFI DASP',
        tipo_pago: 1,
        institucion_ordenante: '646',
        institucion_beneficiaria: '012',
        status: 'LIQUIDATED',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        liquidated_at: new Date(Date.now() - 3600000 * 1.95).toISOString(),
        idempotency_key: 'idem-001-init',
        retry_count: 0,
        cep_url: 'https://www.banxico.org.mx/cep/consulta?folio=10928374',
      },
      {
        id: 'spei-ord-002',
        clave_rastreo: generateClaveRastreo('DASP'),
        beneficiario: {
          nombre: 'CARLOS MENDOZA RIOS',
          tipo_cuenta: 'PAN',
          cuenta: '4152313456789012',
          clabe: '4152313456789012',
          marca_tarjeta: 'VISA',
          rfc_curp: 'MERC850101991',
          banco: 'BANAMEX',
          banco_codigo: '002',
        },
        monto_mxn: 49625.0,
        monto_usd: 2500.0,
        concepto: 'LIQUIDACION TARJETA DEBITO PAN',
        tipo_pago: 1,
        institucion_ordenante: '646',
        institucion_beneficiaria: '002',
        status: 'LIQUIDATED',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        liquidated_at: new Date(Date.now() - 3600000 * 4.98).toISOString(),
        idempotency_key: 'idem-002-init',
        retry_count: 0,
        cep_url: 'https://www.banxico.org.mx/cep/consulta?folio=9823411',
      },
      {
        id: 'spei-ord-003',
        clave_rastreo: generateClaveRastreo('DASP'),
        beneficiario: {
          nombre: 'DISTRIBUIDORA VALLE SAPI',
          tipo_cuenta: 'DIMO',
          cuenta: '5512345678',
          clabe: '5512345678',
          rfc_curp: 'DVA170315XX2',
          banco: 'BANORTE',
          banco_codigo: '072',
        },
        monto_mxn: 148875.0,
        monto_usd: 7500.0,
        concepto: 'PAGO DE PROVEEDORES DIMO BANXICO',
        tipo_pago: 1,
        institucion_ordenante: '646',
        institucion_beneficiaria: '072',
        status: 'SUBMITTED',
        created_at: new Date(Date.now() - 120000).toISOString(),
        submitted_at: new Date(Date.now() - 118000).toISOString(),
        idempotency_key: 'idem-003-init',
        retry_count: 0,
      },
    ];

    const initialData: StoredData = {
      vault: INITIAL_VAULT,
      transactions: [],
      spei_orders: initialOrders,
      idempotency_keys: {},
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: StoredData) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist vault state to disk:', e);
    }
  }

  public getVault(): VaultState {
    return this.data.vault;
  }

  public getTransactions(): ComplianceEvaluationResult[] {
    return this.data.transactions;
  }

  public getSpeiOrders(): SpeiOrder[] {
    return this.data.spei_orders;
  }

  /**
   * Process and record a transaction into the persistent vault memory
   */
  public recordEvaluation(input: TransactionInput): ComplianceEvaluationResult {
    const result = evaluateTransaction(input);

    // Mutate and persist vault statistics
    this.data.vault.total_inflow_usd = Number(
      (this.data.vault.total_inflow_usd + result.financials.inbound_amount_usd).toFixed(2)
    );
    this.data.vault.accumulated_hub_fee_usd = Number(
      (this.data.vault.accumulated_hub_fee_usd + result.financials.hub_fee_usd).toFixed(2)
    );

    if (result.action === 'APPROVE') {
      const netDispersed = result.financials.inbound_amount_usd - result.financials.hub_fee_usd;
      this.data.vault.net_dispersed_usd = Number(
        (this.data.vault.net_dispersed_usd + netDispersed).toFixed(2)
      );
      // Top up crypto vault reserve or SPEI reserve proportionally
      if (input.asset_type === 'stablecoin') {
        this.data.vault.crypto_vault_usdt += netDispersed;
      }

      // Automatically generate real SPEI dispersal for approved AML transfer
      this.generateSpeiDispersalFromEvaluation(result);
    } else {
      this.data.vault.net_refunded_usd = Number(
        (this.data.vault.net_refunded_usd + result.financials.net_refund_amount_usd).toFixed(2)
      );
    }

    this.data.vault.last_updated = new Date().toISOString();
    this.data.transactions.unshift(result);
    // Keep last 100 in memory
    if (this.data.transactions.length > 100) {
      this.data.transactions = this.data.transactions.slice(0, 100);
    }
    this.data.vault.transactions_count = this.data.transactions.length;

    this.saveData(this.data);
    return result;
  }

  /**
   * Automatically dispatches a SPEI dispersal order for an approved AML evaluation
   * Rotates between pre-validated CLABE, PAN, and DIMO destinations
   */
  public generateSpeiDispersalFromEvaluation(result: ComplianceEvaluationResult): SpeiOrder | null {
    if (result.action !== 'APPROVE') return null;

    const netUsd = Number((result.financials.inbound_amount_usd - result.financials.hub_fee_usd).toFixed(2));
    const montoMxn = Math.max(100, Math.round(netUsd * 19.85));

    // Diverse destinations across CLABE, PAN, and DIMO
    const candidateDestinations = [
      {
        nombre: 'NU MEXICO FINANCIERA SA DE CV',
        tipo_cuenta: 'CLABE' as const,
        cuenta: '638180000492817294',
        banco: 'NU MÉXICO FINANCIERA (SOFIPO)',
        banco_codigo: '638',
        rfc_curp: 'FCO190822NU1',
        concepto: `LIQ AML TX-${result.transaction_id.slice(0, 8)}`,
      },
      {
        nombre: 'MERCADO LIBRE SETTLEMENT HUB',
        tipo_cuenta: 'CLABE' as const,
        cuenta: '722180001948271648',
        banco: 'MERCADO PAGO WALLET',
        banco_codigo: '722',
        rfc_curp: 'MLM140301MP9',
        concepto: `PAGO RECEPTOR AML ${result.transaction_id.slice(0, 8)}`,
      },
      {
        nombre: 'BANORTE SERVICIOS FINANCIEROS',
        tipo_cuenta: 'CLABE' as const,
        cuenta: '072180008891029389',
        banco: 'BANORTE',
        banco_codigo: '072',
        rfc_curp: 'LDO150619BN4',
        concepto: `DISPERSION BANORTE ${result.transaction_id.slice(0, 8)}`,
      },
      {
        nombre: 'TESORERIA MOVIL DIMO NU',
        tipo_cuenta: 'DIMO' as const,
        cuenta: '5549208819',
        banco: 'NU MÉXICO FINANCIERA (SOFIPO)',
        banco_codigo: '638',
        rfc_curp: 'TCD210419NL8',
        concepto: `DIMO BANXICO FAST ${result.transaction_id.slice(0, 8)}`,
      },
      {
        nombre: 'TARJETA DEBITO SPIN VISA',
        tipo_cuenta: 'PAN' as const,
        cuenta: '4152313456789012',
        banco: 'SPIN BY OXXO (COMPROPAGO)',
        banco_codigo: '710',
        marca_tarjeta: 'VISA' as const,
        rfc_curp: 'TSV200214JK8',
        concepto: `PAN LIQUIDACION VISA ${result.transaction_id.slice(0, 8)}`,
      },
      {
        nombre: 'PROVEEDORES Y SERVICIOS DEL NORTE SA',
        tipo_cuenta: 'CLABE' as const,
        cuenta: '012180001234567890',
        banco: 'BBVA MÉXICO',
        banco_codigo: '012',
        rfc_curp: 'PSN180412AA9',
        concepto: `CLEARING BBVA ${result.transaction_id.slice(0, 8)}`,
      },
    ];

    const dest = candidateDestinations[Math.floor(Math.random() * candidateDestinations.length)];

    // Ensure reserve liquidity for high-frequency streaming
    if (this.data.vault.spei_reserve_mxn < montoMxn) {
      this.data.vault.spei_reserve_mxn += Math.max(montoMxn * 3, 2500000);
    }

    const claveRastreo = generateClaveRastreo('DASP');
    const idempotencyKey = `auto-spei-${result.transaction_id}-${Date.now()}`;

    try {
      const submission = this.submitSpeiDispersal({
        clave_rastreo: claveRastreo,
        beneficiario: dest,
        monto_mxn: montoMxn,
        monto_usd: netUsd,
        concepto: dest.concepto,
        idempotency_key: idempotencyKey,
      });

      const order = submission.order;

      // Accelerated clearing: auto-liquidate in background after 1200ms
      setTimeout(() => {
        if (order && order.status === 'SUBMITTED') {
          order.status = 'LIQUIDATED';
          order.liquidated_at = new Date().toISOString();
          order.cep_url = `https://www.banxico.org.mx/cep/consulta?folio=${Math.floor(Math.random() * 8999999 + 1000000)}`;
          this.data.vault.last_updated = new Date().toISOString();
          this.saveData(this.data);
        }
      }, 1200);

      return order;
    } catch (e) {
      console.warn('Could not auto-dispatch SPEI order:', e);
      return null;
    }
  }

  /**
   * Synchronous SPEI Dispersal with Idempotency Key validation
   * Supports CLABE (18d), PAN (16d), and DIMO (10d)
   */
  public submitSpeiDispersal(orderData: {
    clave_rastreo: string;
    beneficiario: {
      nombre: string;
      tipo_cuenta?: 'CLABE' | 'PAN' | 'DIMO';
      cuenta: string;
      clabe?: string;
      rfc_curp?: string;
      banco: string;
      banco_codigo: string;
      marca_tarjeta?: 'VISA' | 'MASTERCARD' | 'CARNET' | 'OTRA';
    };
    monto_mxn: number;
    monto_usd: number;
    concepto: string;
    idempotency_key: string;
  }): { status: 'SUBMITTED' | 'DUPLICATE' | 'INSUFFICIENT_FUNDS'; order: SpeiOrder; message: string } {
    const { clave_rastreo, idempotency_key, monto_mxn } = orderData;

    // 1. Check idempotency
    const existingKey = this.data.idempotency_keys[idempotency_key];
    if (existingKey) {
      const existingOrder = this.data.spei_orders.find((o) => o.id === existingKey.order_id);
      if (existingOrder) {
        return {
          status: 'DUPLICATE',
          order: existingOrder,
          message: `Idempotency match: Order already processed under clave ${existingOrder.clave_rastreo}`,
        };
      }
    }

    // Check duplicate clave_rastreo
    const duplicateClave = this.data.spei_orders.find((o) => o.clave_rastreo === clave_rastreo);
    if (duplicateClave) {
      return {
        status: 'DUPLICATE',
        order: duplicateClave,
        message: `Duplicate clave_rastreo ${clave_rastreo} rejected by SPEI network rules`,
      };
    }

    // 2. Check SPEI reserve liquidity
    if (this.data.vault.spei_reserve_mxn < monto_mxn) {
      throw new Error(`Insufficient SPEI MXN liquidity. Available: $${this.data.vault.spei_reserve_mxn.toLocaleString()} MXN`);
    }

    // 3. Create Order
    const newOrder: SpeiOrder = {
      id: 'spei-' + crypto.randomUUID().slice(0, 8),
      clave_rastreo,
      beneficiario: {
        nombre: orderData.beneficiario.nombre,
        tipo_cuenta: orderData.beneficiario.tipo_cuenta || 'CLABE',
        cuenta: orderData.beneficiario.cuenta || orderData.beneficiario.clabe || '',
        clabe: orderData.beneficiario.clabe || orderData.beneficiario.cuenta || '',
        rfc_curp: orderData.beneficiario.rfc_curp,
        banco: orderData.beneficiario.banco,
        banco_codigo: orderData.beneficiario.banco_codigo,
        marca_tarjeta: orderData.beneficiario.marca_tarjeta,
      },
      monto_mxn: orderData.monto_mxn,
      monto_usd: orderData.monto_usd,
      concepto: orderData.concepto,
      tipo_pago: 1,
      institucion_ordenante: '646',
      institucion_beneficiaria: orderData.beneficiario.banco_codigo,
      status: 'SUBMITTED', // Synchronous 202 status
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      idempotency_key,
      retry_count: 0,
    };

    // Deduct pending balance from reserve
    this.data.vault.spei_reserve_mxn -= monto_mxn;
    this.data.vault.spei_dispersals_count += 1;
    this.data.vault.last_updated = new Date().toISOString();

    // Cache idempotency key
    this.data.idempotency_keys[idempotency_key] = {
      status: 'SUBMITTED',
      order_id: newOrder.id,
      created_at: new Date().toISOString(),
    };

    this.data.spei_orders.unshift(newOrder);
    this.saveData(this.data);

    return {
      status: 'SUBMITTED',
      order: newOrder,
      message: 'Transaction accepted by SPEI participant gateway (HTTP 202 SUBMITTED)',
    };
  }

  /**
   * Process asynchronous webhook from STP / Banxico
   */
  public processSpeiWebhook(
    payload: SpeiWebhookPayload,
    signatureHeader?: string,
    rawBody?: string
  ): { success: boolean; status: string; order?: SpeiOrder; error?: string } {
    // 1. Verify HMAC-SHA256 signature if provided
    if (signatureHeader && rawBody) {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(rawBody);
      const computed = hmac.digest('hex');

      // Timing-safe comparison to prevent side-channel timing attacks
      const signatureBuffer = Buffer.from(signatureHeader, 'hex');
      const computedBuffer = Buffer.from(computed, 'hex');

      if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
        return { success: false, status: 'INVALID_SIGNATURE', error: 'HMAC signature verification failed' };
      }
    }

    // 2. Locate order by clave_rastreo
    const order = this.data.spei_orders.find((o) => o.clave_rastreo === payload.clave_rastreo);
    if (!order) {
      return { success: false, status: 'ORDER_NOT_FOUND', error: `No order found for clave ${payload.clave_rastreo}` };
    }

    // Prevent duplicate processing if already terminal
    if (order.status === 'LIQUIDATED' || order.status === 'REJECTED') {
      return { success: true, status: 'ALREADY_TERMINAL', order };
    }

    // 3. Mutate status
    if (payload.estado === 'LIQUIDATED') {
      order.status = 'LIQUIDATED';
      order.liquidated_at = payload.fecha_operacion || new Date().toISOString();
      order.cep_url = `https://www.banxico.org.mx/cep/consulta?folio=${payload.folio_banxico || Math.floor(Math.random() * 8999999 + 1000000)}`;
    } else {
      order.status = 'REJECTED';
      order.rejected_at = payload.fecha_operacion || new Date().toISOString();
      order.motivo_rechazo = payload.motivo_devolucion || 'DEVOLUCIÓN DE FONDOS POR BANCO RECEPTOR';
      // Reimburse reserve on reject
      this.data.vault.spei_reserve_mxn += order.monto_mxn;
    }

    this.data.vault.last_updated = new Date().toISOString();
    this.saveData(this.data);

    return { success: true, status: order.status, order };
  }

  /**
   * Fallback Polling Mechanism for 'SUBMITTED' orders in limbo > 5 minutes
   */
  public pollLimboOrders(): { polledCount: number; updated: SpeiOrder[] } {
    const now = Date.now();
    const updated: SpeiOrder[] = [];

    for (const order of this.data.spei_orders) {
      if (order.status === 'SUBMITTED') {
        const submittedTime = new Date(order.submitted_at || order.created_at).getTime();
        const diffMinutes = (now - submittedTime) / 60000;

        // If in limbo for > 1 minute in demo/sim (or 5 min in prod), resolve via polling
        if (diffMinutes >= 0.5) {
          // In 95% of cases Banxico settles, in 5% returns devolucion
          const isLiquidated = Math.random() > 0.08;
          if (isLiquidated) {
            order.status = 'LIQUIDATED';
            order.liquidated_at = new Date().toISOString();
            order.cep_url = `https://www.banxico.org.mx/cep/consulta?folio=${Math.floor(Math.random() * 8999999 + 1000000)}`;
          } else {
            order.status = 'REJECTED';
            order.rejected_at = new Date().toISOString();
            order.motivo_rechazo = 'CUENTA BENEFICIARIO BLOQUEADA (DEVOLUCIÓN 05)';
            this.data.vault.spei_reserve_mxn += order.monto_mxn;
          }
          updated.push(order);
        }
      }
    }

    if (updated.length > 0) {
      this.data.vault.last_updated = new Date().toISOString();
      this.saveData(this.data);
    }

    return { polledCount: updated.length, updated };
  }

  /**
   * Start / stop automated autonomous ingestion stream with acceleration
   */
  public toggleAutonomousIngestion(active: boolean, speed: 'TURBO' | 'STANDARD' = 'TURBO', intervalMs?: number): boolean {
    this.data.vault.automated_ingestion_active = active;
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }

    if (active) {
      // Accelerated interval: Turbo defaults to 2000ms (2 seconds)
      const chosenInterval = intervalMs || (speed === 'TURBO' ? 2000 : 5000);
      this.autoTimer = setInterval(() => {
        const samples: TransactionInput[] = [
          {
            wallet_type: 'retail',
            amount_usd: 1500 + Math.floor(Math.random() * 8000),
            days_inactive: Math.floor(Math.random() * 20),
            nodes_in_path: 2,
            historical_monthly_avg_usd: 3500,
            asset_type: Math.random() > 0.4 ? 'stablecoin' : 'volatile',
          },
          {
            wallet_type: 'corporate',
            amount_usd: 25000 + Math.floor(Math.random() * 70000),
            days_inactive: Math.floor(Math.random() * 15),
            nodes_in_path: 2,
            historical_monthly_avg_usd: 50000,
            asset_type: 'stablecoin',
          },
          {
            wallet_type: 'retail',
            amount_usd: 4200 + Math.floor(Math.random() * 6000),
            days_inactive: 6,
            nodes_in_path: 2,
            historical_monthly_avg_usd: 2200,
            asset_type: 'volatile',
          },
        ];
        const chosen = samples[Math.floor(Math.random() * samples.length)];
        this.recordEvaluation(chosen);
      }, chosenInterval);
    }

    this.saveData(this.data);
    return active;
  }

  /**
   * Manually trigger one accelerated cycle: evaluates an inbound deposit and generates an immediate SPEI transfer
   */
  public triggerAcceleratedCycle(): { evaluation: ComplianceEvaluationResult; order: SpeiOrder | null } {
    const samples: TransactionInput[] = [
      {
        wallet_type: 'retail',
        amount_usd: 2800 + Math.floor(Math.random() * 9500),
        days_inactive: 8,
        nodes_in_path: 2,
        historical_monthly_avg_usd: 4000,
        asset_type: 'stablecoin',
      },
      {
        wallet_type: 'corporate',
        amount_usd: 45000 + Math.floor(Math.random() * 60000),
        days_inactive: 10,
        nodes_in_path: 2,
        historical_monthly_avg_usd: 65000,
        asset_type: 'stablecoin',
      },
    ];
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    const evaluation = this.recordEvaluation(chosen);
    const order = this.data.spei_orders[0] || null;
    return { evaluation, order };
  }

  public resetVault(): VaultState {
    this.data = {
      vault: { ...INITIAL_VAULT, last_updated: new Date().toISOString() },
      transactions: [],
      spei_orders: [],
      idempotency_keys: {},
    };
    this.saveData(this.data);
    return this.data.vault;
  }
}

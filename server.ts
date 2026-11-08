import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServerVaultManager } from './src/server/vaultManager.ts';
import { evaluateTransaction } from './src/engine/complianceEngine.ts';
import { TransactionInput } from './src/engine/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Support raw body for HMAC verification as well as json
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  const vaultManager = new ServerVaultManager();

  // 1. Vault State & Persistence Endpoint
  app.get('/api/vault', (_req, res) => {
    res.json({
      vault: vaultManager.getVault(),
      transactions: vaultManager.getTransactions(),
      spei_orders: vaultManager.getSpeiOrders(),
    });
  });

  // 2. Evaluate and Accumulate into Server Vault
  app.post('/api/vault/evaluate', (req, res) => {
    try {
      const input: TransactionInput = req.body;
      if (!input || typeof input.amount_usd !== 'number' || !input.wallet_type) {
        return res.status(400).json({
          error: 'Invalid schema. Required: wallet_type, amount_usd, days_inactive, nodes_in_path, historical_monthly_avg_usd, asset_type',
        });
      }

      const result = vaultManager.recordEvaluation(input);
      return res.json({
        evaluation: result,
        vault: vaultManager.getVault(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Evaluation error';
      return res.status(500).json({ error: msg });
    }
  });

  // 3. Autonomous Transaction Evaluator (Strict Schema Output)
  app.post('/api/evaluate', (req, res) => {
    try {
      const input: TransactionInput = req.body;
      if (!input || typeof input.amount_usd !== 'number' || !input.wallet_type) {
        return res.status(400).json({
          error: 'Invalid schema. Required: wallet_type, amount_usd, days_inactive, nodes_in_path, historical_monthly_avg_usd, asset_type',
        });
      }

      // Record in vault and return strict response
      const result = vaultManager.recordEvaluation(input);

      return res.json({
        transaction_id: result.transaction_id,
        action: result.action,
        risk_assessment: {
          score: result.risk_assessment.score,
          triggers_activated: result.risk_assessment.triggers_activated,
          ciphertrace_alert_level: result.risk_assessment.ciphertrace_alert_level,
        },
        financials: {
          inbound_amount_usd: result.financials.inbound_amount_usd,
          applied_rate_percentage: result.financials.applied_rate_percentage,
          hub_fee_usd: result.financials.hub_fee_usd,
          net_refund_amount_usd: result.financials.net_refund_amount_usd,
          estimated_gas_deduction_usd: result.financials.estimated_gas_deduction_usd,
        },
        compliance_action: {
          generate_pasive_sar_report: result.compliance_action.generate_pasive_sar_report,
          blacklist_origin_wallet: result.compliance_action.blacklist_origin_wallet,
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Evaluation error';
      return res.status(500).json({ error: errorMessage });
    }
  });

  // 4. SPEI Synchronous Release (Protocol 1)
  app.post('/api/spei/disperse', (req, res) => {
    try {
      const { clave_rastreo, beneficiario, monto_mxn, monto_usd, concepto, idempotency_key } = req.body;

      const cuentaDestino = beneficiario?.cuenta || beneficiario?.clabe;
      if (!clave_rastreo || !cuentaDestino || !monto_mxn) {
        return res.status(400).json({ error: 'Missing mandatory SPEI fields: clave_rastreo, beneficiario (cuenta o clabe), monto_mxn' });
      }

      const submission = vaultManager.submitSpeiDispersal({
        clave_rastreo,
        beneficiario,
        monto_mxn: Number(monto_mxn),
        monto_usd: Number(monto_usd) || Number(monto_mxn) / 19.85,
        concepto: concepto || 'DISPERSION DASP',
        idempotency_key: idempotency_key || clave_rastreo,
      });

      // Synchronous return: HTTP 202 Accepted (SUBMITTED)
      return res.status(202).json(submission);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'SPEI Release Exception';
      return res.status(422).json({ error: msg });
    }
  });

  // 5. SPEI Asynchronous Webhook Receiver (Protocol 2)
  app.post('/api/spei/webhook', (req: any, res) => {
    try {
      const signatureHeader = req.headers['x-signature'] as string;
      const rawBody = req.rawBody || JSON.stringify(req.body);

      // Fast processing: validate signature and enqueue/process
      const webhookResult = vaultManager.processSpeiWebhook(req.body, signatureHeader, rawBody);

      if (!webhookResult.success) {
        return res.status(400).json({ error: webhookResult.error });
      }

      // Fast ACK (<200ms) to prevent infinite upstream re-deliveries
      return res.status(200).json({
        received: true,
        status: webhookResult.status,
        clave_rastreo: req.body.clave_rastreo,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      return res.status(500).json({ error: msg });
    }
  });

  // 6. Polling fallback for limbo orders ('SUBMITTED' > threshold)
  app.post('/api/spei/poll-limbo', (_req, res) => {
    const result = vaultManager.pollLimboOrders();
    res.json(result);
  });

  // 7. Toggle automated background ingestion with acceleration
  app.post('/api/auto-evaluator/toggle', (req, res) => {
    const { active, speed, intervalMs } = req.body;
    const currentState = vaultManager.toggleAutonomousIngestion(
      Boolean(active),
      speed === 'STANDARD' ? 'STANDARD' : 'TURBO',
      typeof intervalMs === 'number' ? intervalMs : undefined
    );
    res.json({
      automated_ingestion_active: currentState,
      speed: speed === 'STANDARD' ? 'STANDARD' : 'TURBO',
      interval_ms: intervalMs || (speed === 'STANDARD' ? 5000 : 2000),
    });
  });

  // 7b. Trigger single accelerated AML evaluation + SPEI transfer on demand
  app.post('/api/auto-evaluator/trigger', (_req, res) => {
    const result = vaultManager.triggerAcceleratedCycle();
    res.json({
      success: true,
      evaluation: result.evaluation,
      order: result.order,
      vault: vaultManager.getVault(),
    });
  });

  // 8. Administrative reset
  app.post('/api/vault/reset', (_req, res) => {
    const vault = vaultManager.resetVault();
    res.json({ message: 'Vault reset to nominal genesis parameters', vault });
  });

  // 9. System Health
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'OPERATIONAL',
      license: 'CNAD-DASP-SV-2024-8891',
      jurisdiction: 'El Salvador (CNAD) · SPEI STP Bridge (Banxico)',
      ciphertrace_bridge: 'CONNECTED',
      vault_persistence: 'LOCAL_SERVER_DISK_SYNCED',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Crypto Compliance Hub running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

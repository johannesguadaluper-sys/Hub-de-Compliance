import {
  TransactionInput,
  ComplianceEvaluationResult,
  TriggerRule,
  CipherTraceAlertLevel,
} from './types';

/**
 * Autonomous Financial Intelligence Engine & Compliance Controller
 * Regulated under DASP (Digital Asset Service Provider) License by CNAD (El Salvador)
 * CipherTrace API Bridge Integration
 */
export function evaluateTransaction(input: TransactionInput): ComplianceEvaluationResult {
  const transaction_id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tx-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);

  const triggers_activated: TriggerRule[] = [];

  // ==========================================
  // 1. HEURISTIC AML RULES EVALUATION
  // ==========================================

  // Rule 1: Smurfing Rule
  // Detect if a low-flow wallet deviates from its 2-node pattern (Origin -> Destination)
  // into a 3-node path (using pass-through wallets).
  const isSmurfing = input.nodes_in_path >= 3;
  if (isSmurfing) {
    triggers_activated.push('SMURFING');
  }

  // Rule 2: Dormant Assets Rule
  // Identify assets unmoved on-chain for >365 days.
  const isDormant = input.days_inactive > 365;
  if (isDormant) {
    triggers_activated.push('DORMANT_ASSET');
  }

  // Rule 3: Stagnant Corporate Wallets Rule
  // Trigger if a corporate wallet with a history of zero activity suddenly receives a large spike.
  const isCorporate = input.wallet_type === 'corporate';
  const hasZeroOrNearZeroHistory = input.historical_monthly_avg_usd <= 100;
  const hasSignificantInflow = input.amount_usd > 5000;
  const isStagnantCorporate =
    isCorporate &&
    (hasZeroOrNearZeroHistory && (input.amount_usd > 1000 || hasSignificantInflow));

  if (isStagnantCorporate) {
    triggers_activated.push('STAGNANT_CORPORATE');
  }

  // ==========================================
  // 2. RISK SCORE CALCULATION (0 - 100)
  // ==========================================
  let score = 0;

  // Trigger weightings
  if (triggers_activated.includes('SMURFING')) {
    // Smurfing is severe structuring: +45 points
    score += 45;
  }

  if (triggers_activated.includes('DORMANT_ASSET')) {
    // Dormant asset awakening: +35 points
    score += 35;
  }

  if (triggers_activated.includes('STAGNANT_CORPORATE')) {
    // Stagnant corporate sudden spike: +50 points
    score += 50;
  }

  // Additional heuristic: anomalous volume ratio relative to history
  let volumeRatio = 1.0;
  if (input.historical_monthly_avg_usd > 0) {
    volumeRatio = input.amount_usd / input.historical_monthly_avg_usd;
    if (volumeRatio > 15 && !triggers_activated.includes('STAGNANT_CORPORATE')) {
      score += 15;
    } else if (volumeRatio > 5 && score < 30) {
      score += 8;
    }
  }

  // Normalization baseline if no triggers
  if (triggers_activated.length === 0 && score === 0) {
    // Natural low risk score (5-15) based on path length and inactive days
    score = Math.min(20, Math.floor((input.days_inactive / 365) * 8) + (input.nodes_in_path > 1 ? 4 : 2));
  }

  // Clamp risk score to [0, 100]
  score = Math.min(100, Math.max(0, score));

  // Determine CipherTrace Alert Level
  let ciphertrace_alert_level: CipherTraceAlertLevel = 'LOW';
  if (score > 60) {
    ciphertrace_alert_level = 'HIGH';
  } else if (score > 25) {
    ciphertrace_alert_level = 'MEDIUM';
  } else {
    ciphertrace_alert_level = 'LOW';
  }

  // Action decision: Risk Score <= 40 -> APPROVE, > 40 -> REFUND
  const action = score <= 40 ? 'APPROVE' : 'REFUND';

  // ==========================================
  // 3. PRICING ENGINE AUTONOMY
  // ==========================================
  let applied_rate_percentage = 0;
  let hub_fee_usd = 0;
  let net_refund_amount_usd = 0;
  let estimated_gas_deduction_usd = 0;

  // Metadata for audit tracking
  let base_rate = 0;
  let risk_premium = 0;
  let volatility_buffer = 0;
  let raw_penalty_usd = 0;
  let max_cap_usd = 0;
  let is_capped = false;

  if (action === 'APPROVE') {
    // SUCCESSFUL DISPERSAL FEE (Risk Score <= 40)
    // Formula: Base Fee (0.5%) + Risk Premium
    // Risk Premium: Add +0.1% to the fee for every 10 points of Risk Score above 0.
    base_rate = 0.5;
    risk_premium = Number(((score / 10) * 0.1).toFixed(4));
    applied_rate_percentage = Number((base_rate + risk_premium).toFixed(4));

    // Calculate fee
    hub_fee_usd = Number(((input.amount_usd * applied_rate_percentage) / 100).toFixed(2));
    estimated_gas_deduction_usd = 0.0;
    net_refund_amount_usd = 0.0; // Approved for dispersal, no refund issued
  } else {
    // RETURN FEE / REFUND PENALTY (Risk Score > 40)
    // Atomic refund executing penalty to monetize risk and cover CipherTrace API costs.
    // Formula: Base Rejection Fee (2.0%) + Volatility Buffer + Estimated Gas Cost
    base_rate = 2.0;

    // Volatility Buffer: +1.5% for volatile (BTC, ETH, SOL), 0% for stablecoin
    volatility_buffer = input.asset_type === 'volatile' ? 1.5 : 0.0;
    const rate_percentage_before_gas = base_rate + volatility_buffer;

    // Estimated Gas Cost (on-chain smart contract atomic refund overhead)
    estimated_gas_deduction_usd = input.asset_type === 'volatile' ? 18.5 : 4.5;

    // Maximum Cap: Total penalty cannot exceed 5.0% of the volume
    max_cap_usd = Number((input.amount_usd * 0.05).toFixed(2));
    const percentage_fee_usd = (input.amount_usd * rate_percentage_before_gas) / 100;
    raw_penalty_usd = Number((percentage_fee_usd + estimated_gas_deduction_usd).toFixed(2));

    if (raw_penalty_usd > max_cap_usd) {
      is_capped = true;
      hub_fee_usd = max_cap_usd;
    } else {
      is_capped = false;
      hub_fee_usd = raw_penalty_usd;
    }

    // Effective applied rate percentage
    applied_rate_percentage = Number(((hub_fee_usd / input.amount_usd) * 100).toFixed(4));

    // Net Refund Amount: inbound_amount_usd - hub_fee_usd
    net_refund_amount_usd = Number(Math.max(0, input.amount_usd - hub_fee_usd).toFixed(2));
  }

  // ==========================================
  // 4. COMPLIANCE & LEGAL ACTIONS
  // ==========================================
  // Passive SAR (Suspicious Activity Report) generated if high risk, or smurfing/stagnant corporate triggered
  const generate_pasive_sar_report =
    score >= 60 ||
    triggers_activated.includes('SMURFING') ||
    triggers_activated.includes('STAGNANT_CORPORATE');

  // Origin wallet blacklisting if severe risk (score >= 80) or multiple AML violations
  const blacklist_origin_wallet =
    score >= 80 || (triggers_activated.length >= 2 && score >= 75);

  const rail = input.rail || (input.wallet_type === 'corporate' ? 'DeFi' : 'CeFi');

  return {
    transaction_id,
    action,
    risk_assessment: {
      score,
      triggers_activated,
      ciphertrace_alert_level,
    },
    financials: {
      inbound_amount_usd: Number(input.amount_usd.toFixed(2)),
      applied_rate_percentage,
      hub_fee_usd,
      net_refund_amount_usd,
      estimated_gas_deduction_usd,
    },
    compliance_action: {
      generate_pasive_sar_report,
      blacklist_origin_wallet,
    },
    metadata: {
      evaluated_at: new Date().toISOString(),
      dasp_license: 'CNAD-DASP-SV-2024-8891',
      jurisdiction: 'El Salvador (CNAD Regulatory Sandbox)',
      rail,
      rule_breakdown: {
        smurfing_detected: isSmurfing,
        dormant_asset_detected: isDormant,
        stagnant_corporate_detected: isStagnantCorporate,
        volume_spike_ratio: Number(volumeRatio.toFixed(2)),
      },
      pricing_breakdown: {
        base_rate,
        risk_premium,
        volatility_buffer,
        gas_usd: estimated_gas_deduction_usd,
        raw_penalty_usd,
        max_cap_usd,
        is_capped,
      },
    },
  };
}

/**
 * Return strict compliance JSON object matching user specification exactly
 */
export function formatStrictOutputJSON(result: ComplianceEvaluationResult): string {
  const strictOutput = {
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
  };

  return JSON.stringify(strictOutput, null, 2);
}

/**
 * Benchmark Scenario Presets for Compliance Officers & Auditors
 */
export const SCENARIO_PRESETS: {
  id: string;
  name: string;
  category: 'Clean' | 'Warning' | 'High Risk' | 'Critical Laundering';
  description: string;
  input: TransactionInput;
}[] = [
  {
    id: 'smurfing-retail-pass-through',
    name: 'Retail Smurfing Attack (3-Node Pass-Through)',
    category: 'High Risk',
    description: 'Retail user routes funds through intermediary pass-through wallet (3 nodes) with high volume vs history.',
    input: {
      wallet_type: 'retail',
      amount_usd: 9800.0,
      days_inactive: 14,
      nodes_in_path: 3,
      historical_monthly_avg_usd: 650.0,
      asset_type: 'volatile',
      wallet_address: 'bc1q9v8u0q3...m4k7',
      destination_address: 'bc1q88a91c0...p29z',
      asset_symbol: 'BTC',
      chain: 'Bitcoin Core',
      rail: 'CeFi',
    },
  },
  {
    id: 'dormant-whale-awakening',
    name: 'Dormant Whale Awakening (>365d Inactive)',
    category: 'Warning',
    description: 'Long-term dormant crypto wallet unmoved on-chain for 480 days suddenly transferred.',
    input: {
      wallet_type: 'retail',
      amount_usd: 85000.0,
      days_inactive: 480,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 5000.0,
      asset_type: 'volatile',
      wallet_address: '0x71C...392B',
      destination_address: '0x32A...918C',
      asset_symbol: 'ETH',
      chain: 'Ethereum Mainnet',
      rail: 'CeFi',
    },
  },
  {
    id: 'stagnant-corporate-spike',
    name: 'Stagnant Corporate Treasury Sudden Inflow',
    category: 'Critical Laundering',
    description: 'Corporate multi-sig smart contract with zero historical volume receives $250,000 sudden deposit.',
    input: {
      wallet_type: 'corporate',
      amount_usd: 250000.0,
      days_inactive: 60,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 0.0,
      asset_type: 'stablecoin',
      wallet_address: '0xCorpTreasury...001',
      destination_address: '0xDispersalVault...99',
      asset_symbol: 'USDT',
      chain: 'Ethereum (ERC-20)',
      rail: 'DeFi',
    },
  },
  {
    id: 'triple-trigger-syndicate',
    name: 'Triple-Trigger Syndicate Ring (Capped Penalty)',
    category: 'Critical Laundering',
    description: 'Pass-through 3-node routing + >365d dormant asset + zero-activity corporate entity.',
    input: {
      wallet_type: 'corporate',
      amount_usd: 12000.0,
      days_inactive: 520,
      nodes_in_path: 4,
      historical_monthly_avg_usd: 0.0,
      asset_type: 'volatile',
      wallet_address: 'sol_Syndicate...44',
      destination_address: 'sol_Disperser...01',
      asset_symbol: 'SOL',
      chain: 'Solana',
      rail: 'DeFi',
    },
  },
  {
    id: 'clean-retail-payroll',
    name: 'Clean Retail Payroll & Dispersal (Nominal)',
    category: 'Clean',
    description: 'Normal direct 2-node retail wallet with consistent active history dispersing funds.',
    input: {
      wallet_type: 'retail',
      amount_usd: 2400.0,
      days_inactive: 5,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 2500.0,
      asset_type: 'stablecoin',
      wallet_address: '0x992...381F',
      destination_address: '0xRetailPay...771A',
      asset_symbol: 'USDC',
      chain: 'Polygon PoS',
      rail: 'CeFi',
    },
  },
  {
    id: 'clean-corporate-treasury',
    name: 'Verified Corporate Treasury Dispersal',
    category: 'Clean',
    description: 'Established corporate treasury executing batch salary payouts within historical bounds.',
    input: {
      wallet_type: 'corporate',
      amount_usd: 75000.0,
      days_inactive: 12,
      nodes_in_path: 2,
      historical_monthly_avg_usd: 90000.0,
      asset_type: 'stablecoin',
      wallet_address: '0xSafeGnosis...4182',
      destination_address: '0xBatchDisperser...66',
      asset_symbol: 'USDC',
      chain: 'Arbitrum One',
      rail: 'DeFi',
    },
  },
];

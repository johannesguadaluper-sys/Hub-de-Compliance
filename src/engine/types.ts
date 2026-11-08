export type WalletType = 'retail' | 'corporate';
export type AssetType = 'stablecoin' | 'volatile';
export type TriggerRule = 'SMURFING' | 'DORMANT_ASSET' | 'STAGNANT_CORPORATE';
export type CipherTraceAlertLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComplianceActionType = 'APPROVE' | 'REFUND';

export interface TransactionInput {
  wallet_type: WalletType;
  amount_usd: number;
  days_inactive: number;
  nodes_in_path: number;
  historical_monthly_avg_usd: number;
  asset_type: AssetType;

  // Optional contextual audit fields
  wallet_address?: string;
  destination_address?: string;
  asset_symbol?: string;
  chain?: string;
  rail?: 'CeFi' | 'DeFi';
}

export interface RiskAssessment {
  score: number;
  triggers_activated: TriggerRule[];
  ciphertrace_alert_level: CipherTraceAlertLevel;
}

export interface Financials {
  inbound_amount_usd: number;
  applied_rate_percentage: number;
  hub_fee_usd: number;
  net_refund_amount_usd: number;
  estimated_gas_deduction_usd: number;
}

export interface ComplianceAction {
  generate_pasive_sar_report: boolean;
  blacklist_origin_wallet: boolean;
}

export interface ComplianceEvaluationResult {
  transaction_id: string;
  action: ComplianceActionType;
  risk_assessment: RiskAssessment;
  financials: Financials;
  compliance_action: ComplianceAction;

  // Additional regulatory audit metadata for UI inspection
  metadata?: {
    evaluated_at: string;
    dasp_license: string;
    jurisdiction: string;
    rail: 'CeFi' | 'DeFi';
    rule_breakdown: {
      smurfing_detected: boolean;
      dormant_asset_detected: boolean;
      stagnant_corporate_detected: boolean;
      volume_spike_ratio: number;
    };
    pricing_breakdown: {
      base_rate: number;
      risk_premium: number;
      volatility_buffer: number;
      gas_usd: number;
      raw_penalty_usd: number;
      max_cap_usd: number;
      is_capped: boolean;
    };
  };
}

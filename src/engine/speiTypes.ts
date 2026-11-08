export type SpeiStatus = 'INITIAL' | 'SUBMITTED' | 'LIQUIDATED' | 'REJECTED' | 'FAILED_SYNC';
export type SpeiAccountType = 'CLABE' | 'PAN' | 'DIMO';

export interface SpeiBeneficiario {
  nombre: string;
  tipo_cuenta: SpeiAccountType;
  cuenta: string; // 18 dígitos para CLABE, 16 para PAN, 10 para DIMO
  clabe?: string; // Retrocompatibilidad
  rfc_curp?: string;
  banco: string;
  banco_codigo: string;
  marca_tarjeta?: 'VISA' | 'MASTERCARD' | 'CARNET' | 'OTRA';
}

export interface SpeiOrder {
  id: string;
  clave_rastreo: string;
  beneficiario: SpeiBeneficiario;
  monto_mxn: number;
  monto_usd: number;
  concepto: string;
  tipo_pago: number; // 1 = Terceros, 2 = Mismo banco
  institucion_ordenante: string;
  institucion_beneficiaria: string;
  status: SpeiStatus;
  created_at: string;
  submitted_at?: string;
  liquidated_at?: string;
  rejected_at?: string;
  motivo_rechazo?: string;
  cep_url?: string;
  idempotency_key: string;
  retry_count: number;
  signature?: string;
}

export interface SpeiWebhookPayload {
  clave_rastreo: string;
  id: string;
  estado: 'LIQUIDATED' | 'REJECTED' | 'DEVOLUCION';
  fecha_operacion: string;
  monto: number;
  institucion_beneficiaria: string;
  cuenta_beneficiaria: string;
  tipo_cuenta?: SpeiAccountType;
  motivo_devolucion?: string;
  clave_devolucion?: number;
  folio_banxico?: string;
  cep?: {
    sello: string;
    certificado: string;
    cadena_original: string;
  };
}

export interface VaultState {
  total_inflow_usd: number;
  accumulated_hub_fee_usd: number;
  net_dispersed_usd: number;
  net_refunded_usd: number;
  spei_reserve_mxn: number;
  crypto_vault_usdt: number;
  crypto_vault_btc: number;
  crypto_vault_eth: number;
  last_updated: string;
  automated_ingestion_active: boolean;
  transactions_count: number;
  spei_dispersals_count: number;
}

export const MEXICAN_BANKS: Record<string, string> = {
  // Tradicionales Mayores
  '002': 'BANAMEX (CITIBANAMEX)',
  '012': 'BBVA MÉXICO',
  '014': 'SANTANDER MÉXICO',
  '021': 'HSBC MÉXICO',
  '030': 'BANCO DEL BAJÍO',
  '036': 'INBURSA',
  '044': 'SCOTIABANK INVERLAT',
  '058': 'BANREGIO / HEY BANCO',
  '062': 'AFIRME',
  '072': 'BANORTE',
  '110': 'INTERCAM BANCO',
  '112': 'MONEX',
  '127': 'BANCO AZTECA',
  '132': 'MULTIVA',
  '133': 'ACTINVER',
  '137': 'BANCOPPEL',
  '138': 'BANCO COMPARTAMOS',
  '140': 'CONSUBANCO',
  // Billeteras SPEI, Neobancos & SOFIPOs
  '638': 'NU MÉXICO FINANCIERA (SOFIPO)',
  '646': 'STP (SISTEMA DE TRANSFERENCIAS Y PAGOS)',
  '659': 'NU MÉXICO (BANCO EN PROCESO)',
  '677': 'STORI (SOFIPO)',
  '679': 'CUENCA / COVALTO',
  '683': 'ALBO (FINTECH)',
  '684': 'KLAR / SERVICIOS FINANCIEROS ALTERNATIVOS',
  '710': 'SPIN BY OXXO (COMPROPAGO)',
  '722': 'MERCADO PAGO WALLET (MERCADO LIBRE)',
  '846': 'FINANCIERA MEXICANA',
};

export interface AccountValidationResult {
  valid: boolean;
  accountType: SpeiAccountType;
  cuenta: string;
  bankCode: string;
  bankName: string;
  cardBrand?: 'VISA' | 'MASTERCARD' | 'CARNET' | 'OTRA';
  error?: string;
}

/**
 * Validates a standard Mexican 18-digit CLABE with official Banxico modulo 10 checksum
 */
export function validateCLABE(clabe: string): AccountValidationResult {
  const clean = clabe.replace(/\D/g, '');
  if (clean.length !== 18) {
    return {
      valid: false,
      accountType: 'CLABE',
      cuenta: clean,
      bankCode: '',
      bankName: '',
      error: `CLABE debe tener exactamente 18 dígitos numéricos (${clean.length}/18)`,
    };
  }

  const bankCode = clean.substring(0, 3);
  const bankName = MEXICAN_BANKS[bankCode] || 'ENTIDAD BANCARIA REGISTRADA';

  // Banxico Modulo 10 verification weights: 3, 7, 1 repeating
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(clean[i], 10);
    sum += (digit * weights[i]) % 10;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  const actualCheckDigit = parseInt(clean[17], 10);

  if (expectedCheckDigit !== actualCheckDigit) {
    return {
      valid: false,
      accountType: 'CLABE',
      cuenta: clean,
      bankCode,
      bankName,
      error: `Dígito verificador inválido: esperado ${expectedCheckDigit}, recibido ${actualCheckDigit}`,
    };
  }

  return {
    valid: true,
    accountType: 'CLABE',
    cuenta: clean,
    bankCode,
    bankName,
  };
}

/**
 * Validates a 16-digit PAN (Tarjeta de Débito / Tarjeta de Crédito SPEI Tipo 03)
 * Uses standard ISO/IEC 7812 Luhn Modulo-10 checksum and BIN detection
 */
export function validatePAN(pan: string, bancoCodigo: string = '012'): AccountValidationResult {
  const clean = pan.replace(/\D/g, '');
  if (clean.length !== 16) {
    return {
      valid: false,
      accountType: 'PAN',
      cuenta: clean,
      bankCode: bancoCodigo,
      bankName: MEXICAN_BANKS[bancoCodigo] || 'BANCO EMISOR',
      error: `Número de tarjeta (PAN) debe tener exactamente 16 dígitos (${clean.length}/16)`,
    };
  }

  // Detect brand
  let cardBrand: 'VISA' | 'MASTERCARD' | 'CARNET' | 'OTRA' = 'OTRA';
  if (/^4/.test(clean)) {
    cardBrand = 'VISA';
  } else if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(clean)) {
    cardBrand = 'MASTERCARD';
  } else if (/^(506|509|636|639)/.test(clean)) {
    cardBrand = 'CARNET';
  }

  // Luhn Algorithm Checksum
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const validLuhn = sum % 10 === 0;
  if (!validLuhn) {
    return {
      valid: false,
      accountType: 'PAN',
      cuenta: clean,
      bankCode: bancoCodigo,
      bankName: MEXICAN_BANKS[bancoCodigo] || 'BANCO EMISOR',
      cardBrand,
      error: 'Dígito verificador de tarjeta inválido (Algoritmo de Luhn no coincide)',
    };
  }

  const bankName = MEXICAN_BANKS[bancoCodigo] || 'BBVA MÉXICO';

  return {
    valid: true,
    accountType: 'PAN',
    cuenta: clean,
    bankCode: bancoCodigo,
    bankName,
    cardBrand,
  };
}

/**
 * Validates a 10-digit DIMO number (Dinero Móvil Banxico SPEI Tipo 10)
 * Uses Mexican 10-digit national mobile format and destination bank routing
 */
export function validateDIMO(telefono: string, bancoCodigo: string = '012'): AccountValidationResult {
  const clean = telefono.replace(/\D/g, '');
  if (clean.length !== 10) {
    return {
      valid: false,
      accountType: 'DIMO',
      cuenta: clean,
      bankCode: bancoCodigo,
      bankName: MEXICAN_BANKS[bancoCodigo] || 'BANCO RECEPTOR DIMO',
      error: `Teléfono DIMO debe tener exactamente 10 dígitos numéricos (${clean.length}/10)`,
    };
  }

  // Mexican mobile area codes start with 2-9
  if (!/^[2-9]\d{9}$/.test(clean)) {
    return {
      valid: false,
      accountType: 'DIMO',
      cuenta: clean,
      bankCode: bancoCodigo,
      bankName: MEXICAN_BANKS[bancoCodigo] || 'BANCO RECEPTOR DIMO',
      error: 'Formato telefónico inválido para DIMO (debe iniciar con lada válida 2-9)',
    };
  }

  const bankName = MEXICAN_BANKS[bancoCodigo] || 'BBVA MÉXICO';

  return {
    valid: true,
    accountType: 'DIMO',
    cuenta: clean,
    bankCode: bancoCodigo,
    bankName,
  };
}

/**
 * Unified Account Validator for SPEI
 */
export function validateAccount(
  tipo: SpeiAccountType,
  cuenta: string,
  bancoCodigo: string = '012'
): AccountValidationResult {
  switch (tipo) {
    case 'CLABE':
      return validateCLABE(cuenta);
    case 'PAN':
      return validatePAN(cuenta, bancoCodigo);
    case 'DIMO':
      return validateDIMO(cuenta, bancoCodigo);
    default:
      return validateCLABE(cuenta);
  }
}

/**
 * Generates an official SPEI-compliant Clave de Rastreo (30 characters alphanumeric)
 */
export function generateClaveRastreo(prefix: string = 'DASP'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const counter = Math.floor(Math.random() * 899999 + 100000);
  return `${prefix}${dateStr}${rand}${counter}`.slice(0, 30);
}

export interface CfdiMetadata {
  uuid_folio_fiscal: string;
  fecha_timbrado: string;
  rfc_emisor: string;
  nombre_emisor: string;
  regimen_fiscal_emisor: string; // 601 General de Ley Personas Morales
  rfc_receptor: string;
  nombre_receptor: string;
  uso_cfdi: string; // CP01 Pagos, G03 Gastos en general
  regimen_fiscal_receptor: string;
  clave_prod_serv: string; // 84121500 Servicios bancarios y de dispersión
  descripcion: string;
  monto_base_mxn: number;
  comision_hub_mxn: number;
  iva_trasladado_mxn: number;
  total_facturado_mxn: number;
  no_certificado_sat: string;
  no_certificado_emisor: string;
  sello_cfdi: string;
  sello_sat: string;
  cadena_original_sat: string;
}

export interface UifReportEntry {
  folio_aviso: string;
  tipo_alerta: 'UMBRAL_AVISO_LFPIORPI' | 'OPERACION_INUSUAL_ROS' | 'OPERACION_PREOCUPANTE';
  fecha_operacion: string;
  monto_usd: number;
  monto_mxn: number;
  clave_rastreo?: string;
  transaction_id: string;
  sujeto_obligado: string;
  rfc_curp_cliente: string;
  nombre_cliente: string;
  jurisdiccion: 'MEXICO_SAT_UIF' | 'EL_SALVADOR_CNAD_UIF';
  estatus_envio: 'GENERADO' | 'TRANSMITIDO' | 'EN_REVISION';
  motivo_reporte: string;
  indicadores_vulnerabilidad: string[];
}

export interface TravelRulePayload {
  message_id: string;
  standard: 'IVMS101';
  originator: {
    name: string;
    account_number: string;
    national_identity_number: string;
    customer_identification: string;
    country: string;
  };
  beneficiary: {
    name: string;
    account_number: string;
    country: string;
  };
  transfer: {
    amount: number;
    currency: string;
    asset_type: string;
    timestamp: string;
  };
}

export interface FiscalLedgerRecord {
  id: string;
  fecha: string;
  referencia: string;
  tipo_operacion: 'DISPERSION_SPEI' | 'RETORNO_ATOMICO_AML' | 'DISPERSION_DEFI';
  monto_bruto_usd: number;
  monto_bruto_mxn: number;
  comision_bruta_mxn: number;
  iva_retenido_mxn: number; // 16% sobre comisiones
  isr_retenido_mxn: number; // 1.25% - 2.5% retención si aplica
  monto_neto_mxn: number;
  cfdi_uuid: string;
  cumple_lfpiorpi: boolean;
  cumple_travel_rule: boolean;
  auditoria_hash_sha256: string;
}

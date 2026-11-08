import { CfdiMetadata, UifReportEntry, TravelRulePayload, FiscalLedgerRecord } from './fiscalTypes';
import { SpeiOrder } from './speiTypes';
import { ComplianceEvaluationResult } from './types';

/**
 * Genera metadatos y sellos fiscales simulados bajo estándar SAT CFDI 4.0
 */
export function generateCfdiMetadata(
  referencia: string,
  montoBaseMxn: number,
  comisionMxn: number,
  rfcReceptor: string = 'XAXX010101000',
  nombreReceptor: string = 'PUBLICO EN GENERAL'
): CfdiMetadata {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().toUpperCase()
    : '4F8B7A12-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-4E1A-98C2-' + Date.now().toString(16).toUpperCase();

  const fechaTimbrado = new Date().toISOString();
  const ivaTrasladado = Number((comisionMxn * 0.16).toFixed(2));
  const totalFacturado = Number((comisionMxn + ivaTrasladado).toFixed(2));

  const certSat = '00001000000504465028';
  const certEmisor = '00001000000508931122';

  const selloCfdi = `c9F8aB12+${referencia.slice(0, 8)}/kLmNpQrStUvWxYz0123456789==`;
  const selloSat = `SAT99xKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQr==`;
  const cadenaOriginal = `||1.1|${uuid}|${fechaTimbrado}|SAT970701NN3|${selloCfdi}|${certSat}||`;

  return {
    uuid_folio_fiscal: uuid,
    fecha_timbrado: fechaTimbrado,
    rfc_emisor: 'DASP190820AA1',
    nombre_emisor: 'ARCADIA DASP EL SALVADOR SA DE CV (OPERADORA STP)',
    regimen_fiscal_emisor: '601 - General de Ley Personas Morales',
    rfc_receptor: rfcReceptor || 'XAXX010101000',
    nombre_receptor: nombreReceptor,
    uso_cfdi: 'CP01 - Pagos',
    regimen_fiscal_receptor: '616 - Sin obligaciones fiscales',
    clave_prod_serv: '84121500 - Instituciones bancarias y servicios de dispersión',
    descripcion: `Comisión por servicio de dispersión y gestión de liquidez SPEI / DASP - Ref: ${referencia}`,
    monto_base_mxn: montoBaseMxn,
    comision_hub_mxn: comisionMxn,
    iva_trasladado_mxn: ivaTrasladado,
    total_facturado_mxn: totalFacturado,
    no_certificado_sat: certSat,
    no_certificado_emisor: certEmisor,
    sello_cfdi: selloCfdi,
    sello_sat: selloSat,
    cadena_original_sat: cadenaOriginal,
  };
}

/**
 * Evalúa cumplimiento de la Ley Antilavado (LFPIORPI Art. 17 Fracc. XVI en México y Ley LEAD en El Salvador)
 */
export function evaluateFiscalCompliance(
  montoUsd: number,
  montoMxn: number,
  score: number,
  triggers: string[],
  claveRastreo: string,
  clienteNombre: string,
  rfcCurp: string = 'XAXX010101000'
): {
  requiere_identificacion: boolean;
  requiere_aviso_uif: boolean;
  reporteUif?: UifReportEntry;
  travelRule?: TravelRulePayload;
} {
  // LFPIORPI México: Umbral Identificación ~645 UMA (~$70,000 MXN), Umbral Aviso ~1,605 UMA (~$174,000 MXN o $10,000 USD)
  const UMBRAL_IDENTIFICACION_MXN = 70000;
  const UMBRAL_AVISO_MXN = 174000;
  const UMBRAL_TRAVEL_RULE_USD = 1000;

  const requiere_identificacion = montoMxn >= UMBRAL_IDENTIFICACION_MXN || montoUsd >= 3500;
  const requiere_aviso_uif = montoMxn >= UMBRAL_AVISO_MXN || montoUsd >= 10000 || score >= 60 || triggers.length > 0;

  let reporteUif: UifReportEntry | undefined = undefined;

  if (requiere_aviso_uif) {
    const tipoAlerta =
      score >= 60 || triggers.length > 0
        ? 'OPERACION_INUSUAL_ROS'
        : 'UMBRAL_AVISO_LFPIORPI';

    reporteUif = {
      folio_aviso: 'UIF-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 899999 + 100000),
      tipo_alerta: tipoAlerta,
      fecha_operacion: new Date().toISOString(),
      monto_usd: montoUsd,
      monto_mxn: montoMxn,
      clave_rastreo: claveRastreo,
      transaction_id: claveRastreo,
      sujeto_obligado: 'ARCADIA DASP SV / STP MEXICO (Clave SO: 646-DASP-01)',
      rfc_curp_cliente: rfcCurp || 'XAXX010101000',
      nombre_cliente: clienteNombre,
      jurisdiccion: 'MEXICO_SAT_UIF',
      estatus_envio: 'GENERADO',
      motivo_reporte:
        triggers.length > 0
          ? `Alerta de cumplimiento activada: ${triggers.join(', ')} con score de riesgo ${score}/100.`
          : `Operación supera el umbral de aviso obligatorio de la LFPIORPI ($${montoMxn.toLocaleString()} MXN).`,
      indicadores_vulnerabilidad: [
        'Activos Virtuales y Operaciones Interbancarias Concentradas',
        ...(triggers.includes('SMURFING') ? ['Estructuración o fraccionamiento de transferencias (Smurfing)'] : []),
        ...(triggers.includes('DORMANT_ASSET') ? ['Movilización intempestiva de saldos inactivos > 365 días'] : []),
        ...(triggers.includes('STAGNANT_CORPORATE') ? ['Entidad jurídica sin operaciones históricas previas'] : []),
      ],
    };
  }

  // Travel Rule IVMS101 si el monto supera los $1,000 USD
  let travelRule: TravelRulePayload | undefined = undefined;
  if (montoUsd >= UMBRAL_TRAVEL_RULE_USD) {
    travelRule = {
      message_id: 'TR-IVMS101-' + Date.now().toString(36).toUpperCase(),
      standard: 'IVMS101',
      originator: {
        name: 'ARCADIA DASP TREASURY POOL',
        account_number: 'DASP-VAULT-ES-01',
        national_identity_number: 'CNAD-DASP-SV-2024-8891',
        customer_identification: 'CUST-TREASURY-001',
        country: 'SV',
      },
      beneficiary: {
        name: clienteNombre,
        account_number: claveRastreo,
        country: 'MX',
      },
      transfer: {
        amount: montoUsd,
        currency: 'USD',
        asset_type: 'FIAT_SPEI_VASP',
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    requiere_identificacion,
    requiere_aviso_uif,
    reporteUif,
    travelRule,
  };
}

/**
 * Genera el XML oficial del CFDI 4.0 para el archivo fiscal contable
 */
export function generateCfdiXml(cfdi: CfdiMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="DASP"
  Folio="${cfdi.uuid_folio_fiscal.slice(0, 8)}"
  Fecha="${cfdi.fecha_timbrado.slice(0, 19)}"
  Sello="${cfdi.sello_cfdi}"
  FormaPago="03"
  NoCertificado="${cfdi.no_certificado_emisor}"
  SubTotal="${cfdi.comision_hub_mxn.toFixed(2)}"
  Moneda="MXN"
  Total="${cfdi.total_facturado_mxn.toFixed(2)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="PUE"
  LugarExpedicion="06600">
  <cfdi:Emisor
    Rfc="${cfdi.rfc_emisor}"
    Nombre="${cfdi.nombre_emisor}"
    RegimenFiscal="${cfdi.regimen_fiscal_emisor.slice(0, 3)}"/>
  <cfdi:Receptor
    Rfc="${cfdi.rfc_receptor}"
    Nombre="${cfdi.nombre_receptor}"
    DomicilioFiscalReceptor="06600"
    RegimenFiscalReceptor="${cfdi.regimen_fiscal_receptor.slice(0, 3)}"
    UsoCFDI="${cfdi.uso_cfdi.slice(0, 4)}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto
      ClaveProdServ="${cfdi.clave_prod_serv.slice(0, 8)}"
      NoIdentificacion="SRV-DISP-01"
      Cantidad="1"
      ClaveUnidad="E48"
      Unidad="Servicio"
      Descripcion="${cfdi.descripcion}"
      ValorUnitario="${cfdi.comision_hub_mxn.toFixed(2)}"
      Importe="${cfdi.comision_hub_mxn.toFixed(2)}"
      ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado
            Base="${cfdi.comision_hub_mxn.toFixed(2)}"
            Impuesto="002"
            TipoFactor="Tasa"
            TasaOCuota="0.160000"
            Importe="${cfdi.iva_trasladado_mxn.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${cfdi.iva_trasladado_mxn.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado
        Base="${cfdi.comision_hub_mxn.toFixed(2)}"
        Impuesto="002"
        TipoFactor="Tasa"
        TasaOCuota="0.160000"
        Importe="${cfdi.iva_trasladado_mxn.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
      Version="1.1"
      UUID="${cfdi.uuid_folio_fiscal}"
      FechaTimbrado="${cfdi.fecha_timbrado.slice(0, 19)}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="${cfdi.sello_cfdi}"
      NoCertificadoSAT="${cfdi.no_certificado_sat}"
      SelloSAT="${cfdi.sello_sat}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

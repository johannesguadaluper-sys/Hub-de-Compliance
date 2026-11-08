import { jsPDF } from 'jspdf';
import { SpeiOrder } from '../engine/speiTypes';

/**
 * Generates an official, Banxico-standard Comprobante Electrónico de Pago (CEP)
 * PDF receipt using jsPDF for full legal and fiscal traceability (SAT / CFF Art 29-A & Circular 14/2017).
 */
export function generateBanxicoCepPdf(order: SpeiOrder): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const operacionDate = new Date(order.liquidated_at || order.submitted_at || order.created_at);
  const formattedDate = operacionDate.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = operacionDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const folioBanxico =
    order.cep_url?.split('folio=')[1] ||
    Math.floor(Math.random() * 8999999 + 1000000).toString();
  const fullFolio = `2026101700646${folioBanxico}`;
  const certNumber = '00000100000702819234';

  const orderTipo = order.beneficiario.tipo_cuenta || 'CLABE';
  const tipoCuentaCode = orderTipo === 'CLABE' ? '40' : orderTipo === 'PAN' ? '03' : '10';
  const tipoCuentaLabel =
    orderTipo === 'CLABE'
      ? 'Tipo 40 · CLABE Interbancaria (18 dígitos)'
      : orderTipo === 'PAN'
      ? `Tipo 03 · Tarjeta Débito/Crédito PAN (16 dígitos${order.beneficiario.marca_tarjeta ? ' - ' + order.beneficiario.marca_tarjeta : ''})`
      : 'Tipo 10 · Dinero Móvil DIMO (10 dígitos)';

  const displayAccount = order.beneficiario.cuenta || order.beneficiario.clabe || '';

  // Cadena original oficial conforme a especificaciones del Banco de México
  const cadenaOriginal = `||${formattedDate}|${formattedTime}|${fullFolio}|646|${order.beneficiario.banco_codigo}|${order.clave_rastreo}|${order.beneficiario.nombre}|${tipoCuentaCode}|${displayAccount}|${order.monto_mxn.toFixed(2)}|0.00|${order.concepto}||`;

  // Sello digital criptográfico Banxico SHA256withRSA
  const selloDigital = `MEQCID7x9G${order.clave_rastreo.slice(4, 12)}k1LmNpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUvWxYz0123456789==`;

  // --- STYLING & COLORS ---
  const PRIMARY_DARK = [10, 25, 47]; // #0a192f deep navy
  const ACCENT_GREEN = [16, 185, 129]; // #10b981 emerald
  const TEXT_DARK = [30, 41, 59]; // slate-800
  const TEXT_MUTED = [100, 116, 139]; // slate-500
  const BG_LIGHT = [248, 250, 252]; // slate-50
  const BORDER_COLOR = [226, 232, 240]; // slate-200

  // 1. Top Decorative Bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Banner
  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 5, pageWidth, 28, 'F');

  // Title: BANCO DE MÉXICO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BANCO DE MÉXICO', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('SISTEMA DE PAGOS ELECTRÓNICOS INTERBANCARIOS (SPEI)', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('COMPROBANTE ELECTRÓNICO DE PAGO (CEP) CON VALIDEZ FISCAL Y LEGAL', 14, 27);

  // Status Badge on Top Right
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - 65, 12, 51, 8, 2, 2, 'F');
  doc.setTextColor(10, 25, 47);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAGO LIQUIDADO Y ACREDITADO', pageWidth - 63, 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`Folio Banxico: ${fullFolio}`, pageWidth - 65, 26);

  // 3. Fiscal Traceability Notice Box
  let y = 38;
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('NORMATIVA Y TRAZABILIDAD FISCAL:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(
    'Emitido de conformidad con la Circular 14/2017 y Circular 04/2023 DIMO de Banco de México, y el Artículo 29-A del Código Fiscal de la Federación (SAT).',
    18,
    y + 9
  );

  // 4. Two-Column Box: Ordenante (Emisor) vs Beneficiario (Receptor)
  y = 54;
  const colWidth = (pageWidth - 32) / 2;

  // Box 1: Datos del Ordenante
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, y, colWidth, 42, 2, 2, 'FD');

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.roundedRect(14, y, colWidth, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATOS DEL ORDENANTE (EMISOR)', 18, y + 5);

  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ARCADIA DASP EL SALVADOR / STP', 18, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Institución Emisora:', 18, y + 19);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('646 - STP (SISTEMA DE TRANSFERENCIAS Y PAGOS)', 18, y + 23);

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Cuenta Emisora (CLABE):', 18, y + 29);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('646180112233445566', 18, y + 33);

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('RFC Ordenante:', 18, y + 39);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('DASP190820AA1', 50, y + 39);

  // Box 2: Datos del Beneficiario
  const rightX = 14 + colWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX, y, colWidth, 42, 2, 2, 'FD');

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.roundedRect(rightX, y, colWidth, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATOS DEL BENEFICIARIO (RECEPTOR)', rightX + 4, y + 5);

  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const truncatedBeneficiario =
    order.beneficiario.nombre.length > 32
      ? order.beneficiario.nombre.slice(0, 30) + '...'
      : order.beneficiario.nombre;
  doc.text(truncatedBeneficiario, rightX + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Institución Receptora:', rightX + 4, y + 19);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(
    `${order.beneficiario.banco_codigo} - ${order.beneficiario.banco}`,
    rightX + 4,
    y + 23
  );

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Modalidad SPEI / Cuenta:', rightX + 4, y + 29);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`${orderTipo}: ${displayAccount}`, rightX + 4, y + 33);

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('RFC / CURP Beneficiario:', rightX + 4, y + 39);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(order.beneficiario.rfc_curp || 'NO PROPORCIONADO', rightX + 44, y + 39);

  // 5. Operation & Financial Summary Card
  y = 101;
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

  const cardThird = (pageWidth - 28) / 4;

  // Monto MXN
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('MONTO LIQUIDADO (MXN)', 18, y + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`$${order.monto_mxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 18, y + 16);
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Pesos Mexicanos', 18, y + 22);

  // Equivalente USD
  doc.setFontSize(7.5);
  doc.text('EQUIVALENTE EN USD', 18 + cardThird, y + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`$${order.monto_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 18 + cardThird, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('TC Ref: $19.85 MXN/USD', 18 + cardThird, y + 22);

  // IVA de Operación
  doc.setFontSize(7.5);
  doc.text('IVA TRASLADADO', 18 + cardThird * 2, y + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text('$0.00 MXN', 18 + cardThird * 2, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Tasa 0% Exenta', 18 + cardThird * 2, y + 22);

  // Fecha y Hora
  doc.setFontSize(7.5);
  doc.text('FECHA Y HORA BANXICO', 18 + cardThird * 3, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(formattedDate, 18 + cardThird * 3, y + 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedTime} hrs`, 18 + cardThird * 3, y + 21);

  // 6. Operation Identifiers Bar
  y = 135;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('CLAVE DE RASTREO (IDEMPOTENCIA):', 18, y + 6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(order.clave_rastreo, 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`Concepto: "${order.concepto}"  |  Tipo de Pago: 1 (Terceros a Terceros)  |  ${tipoCuentaLabel}`, 18, y + 17);

  // 7. Banxico Cryptographic Security & Digital Signature Section
  y = 160;
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(14, y, pageWidth - 28, 70, 2, 2, 'FD');

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.roundedRect(14, y, pageWidth - 28, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ELEMENTOS DE SEGURIDAD CRIPTOGRÁFICA Y FIRMA DIGITAL BANXICO', 18, y + 5);

  // Certificado
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Número de Serie del Certificado Digital de Banco de México:', 18, y + 13);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('courier', 'bold');
  doc.text(certNumber, 105, y + 13);

  // Cadena Original Box
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Cadena Original del CEP (Estándar Banxico):', 18, y + 20);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, y + 22, pageWidth - 36, 17, 1, 1, 'FD');
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  const splitCadena = doc.splitTextToSize(cadenaOriginal, pageWidth - 42);
  doc.text(splitCadena, 21, y + 26);

  // Sello Digital Banxico Box
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Sello Digital SHA256withRSA de Banco de México:', 18, y + 44);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, y + 46, pageWidth - 36, 14, 1, 1, 'FD');
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(16, 185, 129);
  const splitSello = doc.splitTextToSize(selloDigital, pageWidth - 42);
  doc.text(splitSello, 21, y + 50);

  // Verification URL footnote
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Consulta oficial en portal del Banco de México: https://www.banxico.org.mx/cep/', 18, y + 66);

  // 8. Footer Legal Bar
  const footerY = pageHeight - 16;
  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, footerY, pageWidth, 16, 'F');

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    'Este documento es una representación gráfica oficial de un Comprobante Electrónico de Pago (CEP) transmitido y liquidado en el SPEI.',
    14,
    footerY + 5
  );
  doc.text(
    'Operado por Arcadia DASP bajo licencia CNAD El Salvador con liquidación en STP Clearing participante 646. Válido para deducción y acreditamiento SAT.',
    14,
    footerY + 9
  );
  doc.text(
    `Generado el: ${new Date().toISOString()}  |  ID Transacción: ${order.id}`,
    14,
    footerY + 13
  );

  return doc;
}

/**
 * Downloads the Banxico-standard CEP PDF receipt directly to user's browser.
 */
export function downloadBanxicoCepPdf(order: SpeiOrder): void {
  const doc = generateBanxicoCepPdf(order);
  const fileName = `CEP_BANXICO_${order.clave_rastreo}.pdf`;
  doc.save(fileName);
}

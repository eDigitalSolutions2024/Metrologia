/**
 * Representación impresa (PDF) del CFDI 4.0, generada localmente con
 * `pdfkit` — no depende del PAC. Usa el logo/colores/datos del laboratorio
 * ya configurados en Administración (mismo origen que los PDFs de
 * certificados), pero SIN el nombre "METRYCO": ese es solo el nombre del
 * sistema, la marca visible al cliente es la que esté en
 * Configuracion.laboratorio.nombre (ej. "Laboratorio de Metrología y
 * Consultoría Industrial SC").
 *
 * Requisitos mínimos que el SAT exige en la representación impresa de un
 * CFDI 4.0 (Anexo 20): folio fiscal (UUID), RFC y nombre de emisor/receptor,
 * fecha y hora de emisión y de certificación, número de serie del CSD del
 * emisor y del SAT, sello digital del CFDI, sello del SAT, cadena original
 * del complemento de certificación, y el código QR de verificación del SAT.
 * Como este sistema no timbra con un PAC real todavía (ver
 * docs/FACTURACION.md §10), esos tres últimos campos se imprimen con el
 * valor real que haya devuelto el PAC (o el simulado, marcado como tal) —
 * nunca se inventan.
 */
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { destinoLogos } = require("../middleware/upload");
const configuracionService = require("./configuracion.service");

function num(n) {
  return Number(n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });
}

function fmtFechaCorta(fecha) {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString("es-MX", { dateStyle: "short" });
}

/** URL de verificación pública del SAT para el QR del CFDI (formato oficial). */
function urlVerificacionSat(cfdi) {
  const params = new URLSearchParams({
    id: cfdi.uuid || "",
    re: cfdi.emisor?.rfc || "",
    rr: cfdi.receptor?.rfc || "",
    tt: num(cfdi.total).replace(/,/g, ""),
    fe: (cfdi.selloSat || "").slice(-8),
  });
  return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?${params.toString()}`;
}

/** Ajusta un color hex tipo "#RRGGBB" aclarándolo hacia blanco (factor 0-1). */
function aclarar(hex, factor) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  if (!m) return "#F1F5F9";
  const [r, g, b] = [1, 2, 3].map((i) => Math.round(parseInt(m[i], 16) + (255 - parseInt(m[i], 16)) * factor));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const MOTIVOS_CANCELACION_LABEL = {
  "01": "Comprobante emitido con errores con relación",
  "02": "Comprobante emitido con errores sin relación",
  "03": "No se llevó a cabo la operación",
  "04": "Operación nominativa en una factura global",
};

/**
 * @param {object} cfdi - documento ComprobanteFiscal (ya timbrado) en objeto plano.
 * @returns {Promise<Buffer>}
 */
async function generarPdfCfdi(cfdi) {
  if (!cfdi.uuid) throw new Error("generarPdfCfdi: el comprobante no está timbrado");

  const [lab, logo, colores, qrPng] = await Promise.all([
    configuracionService.obtenerLaboratorio(),
    configuracionService.obtenerLogo(),
    configuracionService.obtenerColores(),
    QRCode.toBuffer(urlVerificacionSat(cfdi), { errorCorrectionLevel: "M", margin: 1, scale: 4 }),
  ]);

  const doc = new PDFDocument({ size: "letter", margin: 0, bufferPages: true });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const fin = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const primario = colores.primario || "#0F172A";
  const secundario = colores.secundario || "#2563EB";
  const claro = aclarar(primario, 0.94);
  const MARGEN = 42;
  const anchoPag = doc.page.width;
  const altoPag = doc.page.height;
  const anchoUtil = anchoPag - MARGEN * 2;
  const cancelada = cfdi.estado === "cancelada";

  // Logo del laboratorio subido en Administración (se re-lee en cada PDF, así
  // que si lo cambian, el siguiente PDF ya sale con el nuevo). Si nadie ha
  // subido uno todavía, el encabezado usa el ícono vectorial de marca del
  // propio sistema (el mismo "BrandMark" del sidebar/login, dibujado con
  // primitivas de pdfkit más abajo) en vez de una imagen — así nunca depende
  // de un archivo de imagen externo, y se ve nítido a cualquier tamaño.
  const rutaLogoAdmin = logo?.nombreArchivo ? path.join(destinoLogos, logo.nombreArchivo) : null;
  const hayLogoAdmin = !!(rutaLogoAdmin && fs.existsSync(rutaLogoAdmin));

  /**
   * Dibuja el "BrandMark" del sistema — el mismo dial de calibración vectorial
   * que se usa en el sidebar/login (12 marcas, aguja, círculos concéntricos),
   * replicado aquí con primitivas de pdfkit en vez de una imagen rasterizada,
   * así se ve nítido a cualquier tamaño. `cx,cy` = centro, `r` = radio del
   * círculo exterior.
   */
  function dibujarBrandMark(cx, cy, r, color) {
    const escala = r / 22; // el ícono original está diseñado sobre radio 22 (viewBox 48x48)
    doc.save();
    doc.strokeColor(color).fillColor(color);
    doc.lineWidth(1.5 * escala);
    doc.circle(cx, cy, 22 * escala).stroke();
    doc.circle(cx, cy, 12.5 * escala).stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const oExt = 21 * escala;
      const oInt = (i % 3 === 0 ? 15 : 18) * escala;
      doc.lineWidth((i % 3 === 0 ? 2 : 1) * escala);
      doc.moveTo(cx + oExt * Math.cos(a), cy + oExt * Math.sin(a))
        .lineTo(cx + oInt * Math.cos(a), cy + oInt * Math.sin(a))
        .stroke();
    }
    doc.lineWidth(2.4 * escala);
    doc.moveTo(cx, cy).lineTo(cx + 10 * escala, cy - 10 * escala).stroke();
    doc.circle(cx, cy, 3.4 * escala).fill();
    doc.restore();
  }

  /**
   * Marca de agua: UN solo bloque grande y centrado con el nombre del
   * laboratorio que esté configurado en ese momento (dinámico — si lo
   * cambian en Administración, el siguiente PDF ya sale con el nuevo
   * nombre), en diagonal y muy tenue. Antes se probó repetirlo en cuadrícula
   * por toda la hoja, pero con nombres largos el texto se encimaba entre
   * repeticiones y se veía como una mancha ilegible — un solo bloque grande
   * es el patrón estándar de marca de agua en documentos formales (PDFs de
   * bancos, contratos, etc.) y es el que pidió el cliente.
   */
  function dibujarMarcaDeAgua() {
    const nombreAgua = (lab.nombre || "").toUpperCase();
    if (!nombreAgua) return;
    const cx = anchoPag / 2;
    const cy = altoPag / 2;
    doc.save();
    doc.opacity(0.055);
    doc.rotate(-38, { origin: [cx, cy] });
    doc.fillColor(primario).font("Helvetica-Bold");

    // Tamaño de letra que ajuste el nombre a un ancho fijo grande, sin que un
    // nombre largo se salga de la hoja ni uno corto se vea chico.
    const anchoBloque = Math.max(anchoPag, altoPag) * 0.95;
    let fontSize = 62;
    doc.fontSize(fontSize);
    while (doc.widthOfString(nombreAgua) > anchoBloque && fontSize > 18) {
      fontSize -= 2;
      doc.fontSize(fontSize);
    }
    doc.text(nombreAgua, cx - anchoBloque / 2, cy - fontSize / 2, { width: anchoBloque, align: "center", lineBreak: false });

    doc.rotate(38, { origin: [cx, cy] });
    doc.restore();
  }

  /**
   * Sello de "CANCELADO" — tipo timbre de esquina (ligeramente inclinado,
   * como un sello de hule real), pero centrado horizontalmente en la hoja y
   * colocado en el tercio inferior en vez de justo en medio, para no tapar
   * la tabla de conceptos ni la caja de totales que quedan más arriba.
   */
  function dibujarSelloCancelado() {
    const cx = anchoPag / 2;
    const cy = altoPag * 0.7;
    const ancho = 300;
    const alto = 70;
    const inclinacion = -16;

    doc.save();
    doc.rotate(inclinacion, { origin: [cx, cy] });

    doc.opacity(0.16);
    doc.roundedRect(cx - ancho / 2, cy - alto / 2, ancho, alto, 8).fill("#FEE2E2");
    doc.opacity(0.55);
    doc.lineWidth(4).strokeColor("#B91C1C");
    doc.roundedRect(cx - ancho / 2, cy - alto / 2, ancho, alto, 8).stroke();
    doc.fillColor("#B91C1C").font("Helvetica-Bold").fontSize(38);
    doc.text("CANCELADO", cx - ancho / 2, cy - 19, { width: ancho, align: "center", lineBreak: false });

    doc.rotate(-inclinacion, { origin: [cx, cy] });
    doc.restore();
  }

  function dibujarMarcasDeFondo() {
    dibujarMarcaDeAgua();
    if (cancelada) dibujarSelloCancelado();
    // Marco sutil de página — le da acabado de documento formal impreso.
    doc.save();
    doc.strokeColor("#E5E7EB").lineWidth(0.75);
    doc.rect(10, 10, anchoPag - 20, altoPag - 20).stroke();
    doc.restore();
  }

  dibujarMarcasDeFondo();

  // ===== Banda de encabezado mejorada =====
  const altoBanda = 110;
  doc.rect(0, 0, anchoPag, altoBanda).fill(primario);
  // Franja decorativa de acento debajo del header
  doc.rect(0, altoBanda, anchoPag, 4).fill(secundario);

  // Logo — cuadro blanco redondeado con padding; imagen de Administración si
  // existe, si no el ícono vectorial de marca del sistema (nunca vacío).
  doc.roundedRect(MARGEN, 18, 70, 70, 6).fill("#ffffff");
  if (hayLogoAdmin) {
    try { doc.image(rutaLogoAdmin, MARGEN + 6, 24, { fit: [58, 58] }); }
    catch { dibujarBrandMark(MARGEN + 35, 53, 25, primario); }
  } else {
    dibujarBrandMark(MARGEN + 35, 53, 25, primario);
  }
  const xNombre = MARGEN + 84;
  const anchoNombre = anchoUtil * 0.52;
  doc.fillColor("#fff").fontSize(16).font("Helvetica-Bold")
    .text(lab.nombre || "", xNombre, 20, { width: anchoNombre, lineGap: 1 });
  doc.fillColor("#CBD5E1").fontSize(7.5).font("Helvetica")
    .text(`RFC ${cfdi.emisor.rfc}  ·  Régimen fiscal ${cfdi.emisor.regimenFiscal}`, xNombre, doc.y + 4, { width: anchoNombre })
    .text(lab.domicilio || "", xNombre, doc.y + 2, { width: anchoNombre });
  if (lab.telefono) {
    doc.text(`Tel. ${lab.telefono}`, xNombre, doc.y + 2, { width: anchoNombre });
  }

  // Caja de folio — diseño card con borde de acento
  const anchoCaja = 196;
  const xCaja = anchoPag - MARGEN - anchoCaja;
  doc.roundedRect(xCaja, 16, anchoCaja, 76, 6).fill("#ffffff");
  // Borde superior de color acento en la caja
  doc.roundedRect(xCaja, 16, anchoCaja, 6, 3).fill(secundario);
  const tipoLabel = cfdi.tipoComprobante === "P" ? "COMPLEMENTO DE PAGO" : "FACTURA (CFDI 4.0)";
  doc.fillColor(secundario).fontSize(8).font("Helvetica-Bold")
    .text(tipoLabel, xCaja, 30, { width: anchoCaja, align: "center" });
  doc.fillColor(primario).fontSize(14).font("Helvetica-Bold")
    .text(`${cfdi.serie ? cfdi.serie + " " : ""}${cfdi.folioInterno}`, xCaja, doc.y + 3, { width: anchoCaja, align: "center" });
  doc.fillColor("#888").fontSize(7.5).font("Helvetica")
    .text(`Emisión: ${fmtFechaCorta(cfdi.fechaEmision || cfdi.createdAt)}`, xCaja, doc.y + 4, { width: anchoCaja, align: "center" });
  doc.fillColor("#888")
    .text(`Lugar: ${cfdi.lugarExpedicion}`, xCaja, doc.y + 2, { width: anchoCaja, align: "center" });

  let y = altoBanda + 4 + 20; // +4 por la franja de acento


  // ===== Badge de estado (cancelado) =====
  if (cancelada) {
    doc.roundedRect(MARGEN, y, anchoUtil, 22, 3).fill("#FEE2E2");
    doc.fillColor("#B91C1C").fontSize(9).font("Helvetica-Bold")
      .text(
        `COMPROBANTE CANCELADO  ·  Motivo ${cfdi.cancelacion?.motivoCodigo || ""}: ${MOTIVOS_CANCELACION_LABEL[cfdi.cancelacion?.motivoCodigo] || ""}  ·  ${fmtFecha(cfdi.cancelacion?.fecha)}`,
        MARGEN + 10, y + 6.5, { width: anchoUtil - 20 }
      );
    y += 22 + 14;
  }

  // ===== Emisor / Receptor =====
  const colAncho = anchoUtil / 2 - 8;
  const xReceptor = MARGEN + colAncho + 16;
  const alturaCaja = 62;

  doc.roundedRect(MARGEN, y, colAncho, alturaCaja, 4).fill(claro);
  doc.roundedRect(xReceptor, y, colAncho, alturaCaja, 4).fill(claro);

  doc.fillColor(secundario).fontSize(7).font("Helvetica-Bold").text("EMISOR", MARGEN + 10, y + 8);
  doc.fillColor("#111").fontSize(9.5).font("Helvetica-Bold").text(cfdi.emisor.nombre, MARGEN + 10, y + 19, { width: colAncho - 20 });
  doc.fillColor("#555").fontSize(7.5).font("Helvetica")
    .text(`RFC: ${cfdi.emisor.rfc}`, MARGEN + 10, doc.y + 3, { width: colAncho - 20 })
    .text(`Régimen fiscal: ${cfdi.emisor.regimenFiscal}`, MARGEN + 10, doc.y + 1, { width: colAncho - 20 });

  doc.fillColor(secundario).fontSize(7).font("Helvetica-Bold").text("RECEPTOR", xReceptor + 10, y + 8);
  doc.fillColor("#111").fontSize(9.5).font("Helvetica-Bold").text(cfdi.receptor.nombre, xReceptor + 10, y + 19, { width: colAncho - 20 });
  doc.fillColor("#555").fontSize(7.5).font("Helvetica")
    .text(`RFC: ${cfdi.receptor.rfc}  ·  CP: ${cfdi.receptor.codigoPostal}`, xReceptor + 10, doc.y + 3, { width: colAncho - 20 })
    .text(`Uso CFDI: ${cfdi.receptor.usoCFDI}  ·  Régimen: ${cfdi.receptor.regimenFiscal}`, xReceptor + 10, doc.y + 1, { width: colAncho - 20 });

  y += alturaCaja + 14;

  // ===== Franja de datos de pago =====
  doc.fillColor("#666").fontSize(7.5).font("Helvetica")
    .text(
      `Método de pago: ${cfdi.metodoPago}   ·   Forma de pago: ${cfdi.formaPago}   ·   Moneda: ${cfdi.moneda}`,
      MARGEN, y, { width: anchoUtil }
    );
  y = doc.y + 14;

  // ===== Tabla de conceptos =====
  const colDesc = anchoUtil * 0.46;
  const colCant = anchoUtil * 0.12;
  const colVU = anchoUtil * 0.19;
  const colImp = anchoUtil * 0.23;

  function encabezadoTabla(yy) {
    doc.roundedRect(MARGEN, yy, anchoUtil, 22, 3).fill(primario);
    doc.fillColor("#fff").fontSize(8).font("Helvetica-Bold");
    doc.text("DESCRIPCIÓN / SERVICIO", MARGEN + 10, yy + 7, { width: colDesc - 10 });
    doc.text("CANT.", MARGEN + colDesc, yy + 7, { width: colCant, align: "right" });
    doc.text("V. UNITARIO", MARGEN + colDesc + colCant, yy + 7, { width: colVU, align: "right" });
    doc.text("IMPORTE", MARGEN + colDesc + colCant + colVU, yy + 7, { width: colImp - 10, align: "right" });
    return yy + 22;
  }

  y = encabezadoTabla(y);

  doc.font("Helvetica").fontSize(8.5).fillColor("#222");
  cfdi.conceptos.forEach((c, i) => {
    const alturaFila = Math.max(20, doc.heightOfString(c.descripcion, { width: colDesc - 10 }) + 10);
    if (y + alturaFila > doc.page.height - 150) {
      doc.addPage();
      dibujarMarcasDeFondo();
      y = MARGEN;
      y = encabezadoTabla(y);
      doc.font("Helvetica").fontSize(8.5).fillColor("#222");
    }
    if (i % 2 === 1) doc.rect(MARGEN, y, anchoUtil, alturaFila).fill("#FAFAFA");
    doc.fillColor("#222");
    doc.text(c.descripcion, MARGEN + 10, y + 5, { width: colDesc - 10 });
    doc.text(String(c.cantidad), MARGEN + colDesc, y + 5, { width: colCant, align: "right" });
    doc.text(num(c.valorUnitario), MARGEN + colDesc + colCant, y + 5, { width: colVU, align: "right" });
    doc.text(num(c.importe), MARGEN + colDesc + colCant + colVU, y + 5, { width: colImp - 10, align: "right" });
    y += alturaFila;
  });
  doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(MARGEN, y).lineTo(MARGEN + anchoUtil, y).stroke();
  y += 14;

  // ===== Totales =====
  const anchoCajaTot = 210;
  const xCajaTot = MARGEN + anchoUtil - anchoCajaTot;
  const filasTot = 2 + (Number(cfdi.descuento) > 0 ? 1 : 0);
  const altoCajaTot = filasTot * 15 + 34;
  doc.roundedRect(xCajaTot, y, anchoCajaTot, altoCajaTot, 4).fill(claro);

  let yTot = y + 10;
  const xEtiqueta = xCajaTot + 14;
  const anchoEtiqueta = anchoCajaTot - 28;
  doc.fontSize(8.5).font("Helvetica").fillColor("#555");
  doc.text("Subtotal", xEtiqueta, yTot, { width: anchoEtiqueta * 0.5 });
  doc.text(num(cfdi.subtotal), xEtiqueta, yTot, { width: anchoEtiqueta, align: "right" });
  yTot += 15;
  if (Number(cfdi.descuento) > 0) {
    doc.text("Descuento", xEtiqueta, yTot, { width: anchoEtiqueta * 0.5 });
    doc.text(`- ${num(cfdi.descuento)}`, xEtiqueta, yTot, { width: anchoEtiqueta, align: "right" });
    yTot += 15;
  }
  doc.text("IVA", xEtiqueta, yTot, { width: anchoEtiqueta * 0.5 });
  doc.text(num(cfdi.totalImpuestosTrasladados), xEtiqueta, yTot, { width: anchoEtiqueta, align: "right" });
  yTot += 18;
  doc.strokeColor("#D1D5DB").moveTo(xEtiqueta, yTot - 4).lineTo(xCajaTot + anchoCajaTot - 14, yTot - 4).stroke();
  doc.fontSize(12.5).font("Helvetica-Bold").fillColor(secundario);
  doc.text("Total", xEtiqueta, yTot, { width: anchoEtiqueta * 0.5 });
  doc.text(num(cfdi.total), xEtiqueta, yTot, { width: anchoEtiqueta, align: "right" });

  y += altoCajaTot + 18;

  // ===== Complemento de Pago (si aplica) =====
  if (cfdi.tipoComprobante === "P" && cfdi.pago) {
    doc.roundedRect(MARGEN, y, anchoUtil, 52, 4).fill(claro);
    doc.fillColor(secundario).fontSize(8).font("Helvetica-Bold").text("COMPLEMENTO DE PAGO", MARGEN + 10, y + 8);
    doc.fillColor("#333").fontSize(8).font("Helvetica")
      .text(`Fecha de pago: ${fmtFecha(cfdi.pago.fechaPago)}   ·   Forma de pago: ${cfdi.pago.formaPago}   ·   Monto: ${num(cfdi.pago.monto)}`, MARGEN + 10, y + 20, { width: anchoUtil - 20 });
    if (cfdi.pago.docRelacionado) {
      const dr = cfdi.pago.docRelacionado;
      doc.text(`Documento relacionado: ${dr.idDocumento}  ·  Parcialidad ${dr.numParcialidad}  ·  Saldo anterior: ${num(dr.impSaldoAnterior)} -> Saldo insoluto: ${num(dr.impSaldoInsoluto)}`, MARGEN + 10, y + 33, { width: anchoUtil - 20 });
    }
    y += 52 + 16;
  }

  // ===== Pie fijo: QR + sellos =====
  const altoPie = 126;
  const yPie = doc.page.height - altoPie;
  if (y > yPie - 10) { doc.addPage(); dibujarMarcasDeFondo(); }

  // Separador del pie con franja de color acento
  doc.rect(MARGEN, yPie - 3, anchoUtil, 3).fill(secundario);
  doc.rect(MARGEN, yPie, anchoUtil, 0.5).fill("#E5E7EB");

  doc.image(qrPng, MARGEN, yPie + 10, { fit: [96, 96] });

  const xDatos = MARGEN + 112;
  const anchoDatos = anchoUtil - 112;
  const campo = (etiqueta, valor, y0) => {
    doc.fillColor("#888").fontSize(6.8).font("Helvetica-Bold").text(etiqueta, xDatos, y0, { width: anchoDatos });
    doc.fillColor("#444").fontSize(6.6).font("Helvetica").text(valor || "(no disponible)", xDatos, doc.y + 1, { width: anchoDatos });
    return doc.y + 5;
  };
  let yCampo = yPie + 10;
  yCampo = campo("FOLIO FISCAL (UUID)", cfdi.uuid, yCampo);
  yCampo = campo("FECHA DE CERTIFICACIÓN", fmtFecha(cfdi.fechaTimbrado), yCampo);
  yCampo = campo("SELLO DIGITAL DEL CFDI / SELLO DEL SAT", cfdi.selloSat, yCampo);
  campo("CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACIÓN DIGITAL DEL SAT", cfdi.cadenaOriginal, yCampo);

  // Texto de pie centrado
  const textoPie = `Este documento es una representación impresa de un CFDI — ${lab.nombre || ""}`;
  doc.fillColor("#AAA").fontSize(6.5).font("Helvetica")
    .text(textoPie, MARGEN, doc.page.height - 16, { width: anchoUtil - 60, align: "center" });

  // Numeración de página (siempre visible)
  const totalPaginas = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPaginas; i++) {
    doc.switchToPage(i);
    doc.fillColor("#AAA").fontSize(6.5).font("Helvetica")
      .text(`Pág. ${i + 1} / ${totalPaginas}`, anchoPag - MARGEN - 80, altoPag - 16, { width: 80, align: "right" });
  }

  doc.end();
  return fin;
}

module.exports = { generarPdfCfdi, urlVerificacionSat };

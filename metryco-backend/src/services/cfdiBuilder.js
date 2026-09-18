/**
 * Generador del XML CFDI 4.0 sin timbrar, y validación estricta de formato
 * ANTES de intentarlo — así un dato mal capturado (RFC con formato inválido,
 * CP con letras, etc.) se detecta aquí, en METRYCO, en vez de que el PAC lo
 * rechace después de gastar la llamada (y potencialmente confundir con un
 * error de conexión).
 *
 * El XML que arma esta pieza NUNCA lleva Sello/Certificado/NoCertificado —
 * esos los completa el PAC con el CSD (aquí no se maneja ningún certificado
 * ni llave privada, por diseño — ver docs/FACTURACION.md §10 Seguridad).
 * Por eso el resultado de `construirXml` es "CFDI sin timbrar": lo usan los
 * adaptadores de PAC que reciben XML (ej. SW Sapien) tal cual; los que
 * reciben JSON (ej. Facturama) ignoran el XML y arman su propio payload a
 * partir del mismo snapshot de `ComprobanteFiscal`.
 *
 * Basado en los nombres de nodo/atributo confirmados contra la Guía de
 * llenado del CFDI (SAT, Anexo 20, CFDI 4.0) — DomicilioFiscalReceptor y
 * RegimenFiscalReceptor son los nombres reales de esos atributos en el XML,
 * aunque en el modelo de Mongo se llamen `codigoPostal`/`regimenFiscal`
 * dentro de `receptor` por legibilidad interna.
 */

const AppError = require("../utils/AppError");

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const CP_REGEX = /^\d{5}$/;

function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Formato exacto que exige el SAT: AAAA-MM-DDThh:mm:ss (sin milisegundos ni zona horaria). */
function formatearFecha(fecha) {
  const d = fecha ? new Date(fecha) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function num(n, decimales = 2) {
  return Number(n ?? 0).toFixed(decimales);
}

/**
 * Valida el comprobante completo contra los requisitos de formato del CFDI
 * 4.0 (no solo "existe", también "tiene la forma correcta") y regresa la
 * lista COMPLETA de problemas encontrados — no se detiene en el primero, así
 * quien lo corrija ve todo lo que falta de una vez.
 */
function validarComprobante(cfdi) {
  const errores = [];

  if (!RFC_REGEX.test(cfdi.emisor?.rfc || "")) errores.push(`RFC del emisor con formato inválido: "${cfdi.emisor?.rfc}"`);
  if (!cfdi.emisor?.nombre?.trim()) errores.push("Falta el nombre/razón social del emisor");
  if (!cfdi.emisor?.regimenFiscal?.trim()) errores.push("Falta el régimen fiscal del emisor");

  if (!RFC_REGEX.test(cfdi.receptor?.rfc || "")) errores.push(`RFC del receptor con formato inválido: "${cfdi.receptor?.rfc}"`);
  if (!cfdi.receptor?.nombre?.trim()) errores.push("Falta el nombre/razón social del receptor");
  if (!CP_REGEX.test(cfdi.receptor?.codigoPostal || "")) errores.push(`Código postal del receptor con formato inválido: "${cfdi.receptor?.codigoPostal}" (deben ser 5 dígitos)`);
  if (!cfdi.receptor?.regimenFiscal?.trim()) errores.push("Falta el régimen fiscal del receptor");
  if (!cfdi.receptor?.usoCFDI?.trim()) errores.push("Falta el uso de CFDI del receptor");

  if (!CP_REGEX.test(cfdi.lugarExpedicion || "")) errores.push(`Lugar de expedición (CP) con formato inválido: "${cfdi.lugarExpedicion}" (deben ser 5 dígitos)`);
  if (!cfdi.formaPago?.trim()) errores.push("Falta la forma de pago (catálogo SAT c_FormaPago)");
  if (!["PUE", "PPD"].includes(cfdi.metodoPago)) errores.push(`Método de pago inválido: "${cfdi.metodoPago}" (debe ser PUE o PPD)`);
  if (!["MXN", "USD"].includes(cfdi.moneda)) errores.push(`Moneda inválida: "${cfdi.moneda}"`);

  if (!Array.isArray(cfdi.conceptos) || cfdi.conceptos.length === 0) {
    errores.push("El comprobante debe tener al menos un concepto");
  } else {
    cfdi.conceptos.forEach((c, i) => {
      const etiqueta = `Concepto #${i + 1}`;
      if (!/^\d{6,8}$/.test(c.claveProdServ || "")) errores.push(`${etiqueta}: clave de producto/servicio SAT inválida: "${c.claveProdServ}"`);
      if (!c.claveUnidad?.trim()) errores.push(`${etiqueta}: falta la clave de unidad SAT`);
      if (!c.descripcion?.trim()) errores.push(`${etiqueta}: falta la descripción`);
      if (!(Number(c.cantidad) > 0)) errores.push(`${etiqueta}: la cantidad debe ser mayor a 0`);
      if (Number(c.valorUnitario) < 0) errores.push(`${etiqueta}: el valor unitario no puede ser negativo`);
      if (!["01", "02", "03"].includes(c.objetoImpuesto)) errores.push(`${etiqueta}: objeto de impuesto inválido: "${c.objetoImpuesto}"`);
      if (c.objetoImpuesto === "02" && !(c.impuestos || []).some((imp) => imp.tipo === "traslado")) {
        errores.push(`${etiqueta}: está marcado "Sí objeto de impuesto" pero no tiene ningún impuesto trasladado`);
      }
      if (c.objetoImpuesto === "01" && (c.impuestos || []).length) {
        errores.push(`${etiqueta}: está marcado "No objeto de impuesto" pero trae impuestos — son incompatibles`);
      }
    });
  }

  if (!(Number(cfdi.subtotal) >= 0)) errores.push("Subtotal inválido");
  if (!(Number(cfdi.total) >= 0)) errores.push("Total inválido");

  if (errores.length) {
    throw new AppError(
      `El comprobante no cumple el formato CFDI 4.0 — no se puede generar el XML: ${errores.join(" | ")}`,
      400,
      errores
    );
  }
}

/** Agrupa los impuestos de todos los conceptos por (Impuesto, TipoFactor, TasaOCuota) — el SAT exige UN solo registro por combinación en el nodo resumen `Impuestos`, no uno por concepto. */
function agruparImpuestos(conceptos) {
  const grupos = new Map();
  for (const c of conceptos) {
    for (const imp of c.impuestos || []) {
      if (imp.tipo !== "traslado") continue; // el sistema no maneja retenciones todavía
      const clave = `${imp.impuesto}|${imp.tipoFactor}|${imp.tasaOCuota}`;
      const actual = grupos.get(clave) || { impuesto: imp.impuesto, tipoFactor: imp.tipoFactor, tasaOCuota: imp.tasaOCuota, base: 0, importe: 0 };
      actual.base += Number(imp.base) || 0;
      actual.importe += Number(imp.importe) || 0;
      grupos.set(clave, actual);
    }
  }
  return [...grupos.values()];
}

/**
 * Arma el XML del CFDI 4.0 SIN timbrar (sin Sello/Certificado/NoCertificado
 * — eso lo completa el PAC). Valida el comprobante primero; si algo no
 * cumple el formato, lanza antes de generar una sola línea de XML.
 */
function construirXml(cfdi) {
  validarComprobante(cfdi);

  const conceptosXml = cfdi.conceptos.map((c) => {
    const traslados = (c.impuestos || [])
      .filter((imp) => imp.tipo === "traslado")
      .map((imp) => (
        `<cfdi:Traslado Base="${num(imp.base, 6)}" Impuesto="${escaparXml(imp.impuesto)}" TipoFactor="${escaparXml(imp.tipoFactor)}" TasaOCuota="${num(imp.tasaOCuota, 6)}" Importe="${num(imp.importe, 2)}"/>`
      ))
      .join("");
    const impuestosNodo = traslados
      ? `<cfdi:Impuestos><cfdi:Traslados>${traslados}</cfdi:Traslados></cfdi:Impuestos>`
      : "";
    const descuentoAttr = Number(c.descuento) > 0 ? ` Descuento="${num(c.descuento, 6)}"` : "";
    const unidadAttr = c.unidad ? ` Unidad="${escaparXml(c.unidad)}"` : "";

    return (
      `<cfdi:Concepto ClaveProdServ="${escaparXml(c.claveProdServ)}" Cantidad="${num(c.cantidad, 6)}" ` +
      `ClaveUnidad="${escaparXml(c.claveUnidad)}"${unidadAttr} Descripcion="${escaparXml(c.descripcion)}" ` +
      `ValorUnitario="${num(c.valorUnitario, 6)}" Importe="${num(c.importe, 6)}"${descuentoAttr} ObjetoImp="${escaparXml(c.objetoImpuesto)}">` +
      `${impuestosNodo}</cfdi:Concepto>`
    );
  }).join("");

  const trasladosResumen = agruparImpuestos(cfdi.conceptos);
  const totalTrasladados = trasladosResumen.reduce((s, t) => s + t.importe, 0);
  const impuestosResumenXml = trasladosResumen.length
    ? `<cfdi:Impuestos TotalImpuestosTrasladados="${num(totalTrasladados, 2)}"><cfdi:Traslados>` +
      trasladosResumen.map((t) => `<cfdi:Traslado Base="${num(t.base, 2)}" Impuesto="${escaparXml(t.impuesto)}" TipoFactor="${escaparXml(t.tipoFactor)}" TasaOCuota="${num(t.tasaOCuota, 6)}" Importe="${num(t.importe, 2)}"/>`).join("") +
      `</cfdi:Traslados></cfdi:Impuestos>`
    : "";

  const descuentoAttr = Number(cfdi.descuento) > 0 ? ` Descuento="${num(cfdi.descuento, 2)}"` : "";
  const serieAttr = cfdi.serie ? ` Serie="${escaparXml(cfdi.serie)}"` : "";

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" ` +
    `Version="4.0"${serieAttr} Folio="${escaparXml(cfdi.folioInterno)}" Fecha="${formatearFecha(cfdi.fechaEmision)}" ` +
    `FormaPago="${escaparXml(cfdi.formaPago)}" SubTotal="${num(cfdi.subtotal, 2)}"${descuentoAttr} ` +
    `Moneda="${escaparXml(cfdi.moneda)}" Total="${num(cfdi.total, 2)}" ` +
    `TipoDeComprobante="${escaparXml(cfdi.tipoComprobante)}" Exportacion="01" MetodoPago="${escaparXml(cfdi.metodoPago)}" ` +
    `LugarExpedicion="${escaparXml(cfdi.lugarExpedicion)}">` +
    `<cfdi:Emisor Rfc="${escaparXml(cfdi.emisor.rfc)}" Nombre="${escaparXml(cfdi.emisor.nombre)}" RegimenFiscal="${escaparXml(cfdi.emisor.regimenFiscal)}"/>` +
    `<cfdi:Receptor Rfc="${escaparXml(cfdi.receptor.rfc)}" Nombre="${escaparXml(cfdi.receptor.nombre)}" ` +
    `DomicilioFiscalReceptor="${escaparXml(cfdi.receptor.codigoPostal)}" RegimenFiscalReceptor="${escaparXml(cfdi.receptor.regimenFiscal)}" ` +
    `UsoCFDI="${escaparXml(cfdi.receptor.usoCFDI)}"/>` +
    `<cfdi:Conceptos>${conceptosXml}</cfdi:Conceptos>` +
    impuestosResumenXml +
    `</cfdi:Comprobante>`;

  return xml;
}

module.exports = { validarComprobante, construirXml, agruparImpuestos, escaparXml, formatearFecha, RFC_REGEX, CP_REGEX };

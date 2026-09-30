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

// TipoCambioP/EquivalenciaDR: el SAT exige literal "1" sin decimales cuando
// no hay conversión real de moneda (ver construirComplementoPago).
function numTipoCambio(n) {
  const v = Number(n ?? 1);
  return v === 1 ? "1" : v.toFixed(6);
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
  // Regla del SAT (solo comprobantes de Ingreso): con PPD la forma de pago
  // debe ser "99 - Por definir" (la real se declara luego en el Complemento
  // de Pago); con PUE, "99" no es válida.
  if (cfdi.tipoComprobante === "I") {
    if (cfdi.metodoPago === "PPD" && cfdi.formaPago !== "99") errores.push('Con método de pago PPD la forma de pago debe ser "99 - Por definir"');
    if (cfdi.metodoPago === "PUE" && cfdi.formaPago === "99") errores.push('Con método de pago PUE la forma de pago no puede ser "99 - Por definir"');
  }
  // "XXX" solo es válido en un Complemento de Pago (tipoComprobante="P") —
  // el Anexo 20 lo exige ahí porque Subtotal/Total del comprobante van en 0.
  const monedasValidas = cfdi.tipoComprobante === "P" ? ["MXN", "USD", "XXX"] : ["MXN", "USD"];
  if (!monedasValidas.includes(cfdi.moneda)) errores.push(`Moneda inválida: "${cfdi.moneda}"`);

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

  if (cfdi.tipoComprobante === "P") {
    const dr = cfdi.pago?.docRelacionado;
    if (!cfdi.pago?.fechaPago) errores.push("Complemento de Pago: falta la fecha de pago");
    if (!cfdi.pago?.formaPago?.trim()) errores.push("Complemento de Pago: falta la forma de pago");
    if (!(Number(cfdi.pago?.monto) > 0)) errores.push("Complemento de Pago: el monto debe ser mayor a 0");
    if (!dr?.idDocumento) errores.push("Complemento de Pago: falta el UUID del comprobante que se está pagando");
    if (!(Number(dr?.impSaldoAnterior) >= 0)) errores.push("Complemento de Pago: falta el saldo anterior del documento relacionado");
    if (!(Number(dr?.impPagado) > 0)) errores.push("Complemento de Pago: falta el importe pagado del documento relacionado");
    if (!(Number(dr?.impSaldoInsoluto) >= 0)) errores.push("Complemento de Pago: falta el saldo insoluto resultante");
  }

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

// Nombre del atributo de pago20:Totales para cada (tasa, tipo) soportado —
// el SAT exige un atributo DISTINTO por tasa (TotalTrasladosBaseIVA16,
// TotalTrasladosBaseIVA8, etc.), no una lista genérica. Este sistema solo
// maneja IVA 16% y 0% (ver CrearCfdiDialog "Tasa de IVA"), así que solo se
// contemplan esos dos — un traslado con una tasa distinta no debería poder
// llegar aquí porque el formulario no la ofrece, pero si llegara, se omite
// de Totales en vez de inventar un nombre de atributo que no exista.
const SUFIJO_TOTALES_IVA = { "0.16": "IVA16", "0": "IVA0" };

function nodosTraslados(impuestos, sufijoAttrs) {
  return (impuestos || [])
    .filter((t) => t.tasaOCuota != null)
    .map((t) => (
      `<pago20:Traslado${sufijoAttrs} Base${sufijoAttrs}="${num(t.base, 2)}" Impuesto${sufijoAttrs}="${escaparXml(t.impuesto || "002")}" ` +
      `TipoFactor${sufijoAttrs}="${escaparXml(t.tipoFactor || "Tasa")}" TasaOCuota${sufijoAttrs}="${num(t.tasaOCuota, 6)}" Importe${sufijoAttrs}="${num(t.importe, 2)}"/>`
    )).join("");
}

/** pago20:Totales — agrega TODOS los pagos del complemento (aquí siempre uno solo) agrupados por tasa. */
function nodoTotalesPago(impuestosP, montoTotalPagos) {
  const porTasa = {};
  for (const t of impuestosP || []) {
    const suf = SUFIJO_TOTALES_IVA[String(t.tasaOCuota)];
    if (!suf) continue; // tasa no contemplada por este sistema — se omite en vez de adivinar el nombre del atributo
    const actual = porTasa[suf] || { base: 0, importe: 0 };
    actual.base += Number(t.base) || 0;
    actual.importe += Number(t.importe) || 0;
    porTasa[suf] = actual;
  }
  const attrsTasas = Object.entries(porTasa)
    .map(([suf, v]) => `TotalTrasladosBase${suf}="${num(v.base, 2)}" TotalTrasladosImpuesto${suf}="${num(v.importe, 2)}"`)
    .join(" ");
  return `<pago20:Totales ${attrsTasas}${attrsTasas ? " " : ""}MontoTotalPagos="${num(montoTotalPagos, 2)}"/>`;
}

/**
 * Nodo Complemento/Pagos (versión 2.0) — solo para comprobantes tipo "P".
 * Estructura real del Anexo 20 / Complemento de Pago 2.0 del SAT: un CFDI de
 * Pago va con Subtotal="0"/Total="0" y un concepto genérico (ver
 * cfdi.service.emitirComplementoPago), y el pago real se declara aquí, con
 * el saldo antes/después de ESTE pago sobre el documento que se está
 * liquidando (`DoctoRelacionado`), el desglose de impuestos DEL DOCUMENTO
 * (ImpuestosDR, sin prorratear) y el desglose de impuestos DE ESTE PAGO
 * (ImpuestosP, prorrateado si el pago es parcial — ver
 * cfdi.service.emitirComplementoPago) y el nodo `Totales` que exige el SAT.
 *
 * Alcance actual: un solo `Pago` con un solo `DoctoRelacionado` — no cubre
 * pagos que abonan a varios CFDI a la vez, ni multi-moneda con equivalencia
 * distinta de 1.
 */
function construirComplementoPago(cfdi) {
  const p = cfdi.pago;
  const dr = p.docRelacionado;

  const impuestosDRXml = nodosTraslados(dr.impuestos, "DR");
  const impuestosPXml = nodosTraslados(p.impuestos, "P");

  return (
    `<cfdi:Complemento>` +
    `<pago20:Pagos Version="2.0">` +
    nodoTotalesPago(p.impuestos, p.monto) +
    `<pago20:Pago FechaPago="${formatearFecha(p.fechaPago)}" FormaDePagoP="${escaparXml(p.formaPago)}" ` +
    // El SAT exige TipoCambioP/EquivalenciaDR literales "1" (sin decimales)
    // cuando no hay conversión de moneda real — "1.000000" lo rechaza
    // (CRP20215), mismo patrón que SubTotal/Total/Cantidad arriba. Este
    // sistema no maneja tipo de cambio real todavía, así que en la práctica
    // siempre es 1.
    `MonedaP="${escaparXml(p.moneda || "MXN")}" TipoCambioP="${numTipoCambio(p.tipoCambio)}" Monto="${num(p.monto, 2)}">` +
    `<pago20:DoctoRelacionado IdDocumento="${escaparXml(dr.idDocumento)}"` +
    (dr.serie ? ` Serie="${escaparXml(dr.serie)}"` : "") +
    (dr.folio ? ` Folio="${escaparXml(dr.folio)}"` : "") +
    ` MonedaDR="${escaparXml(dr.moneda || "MXN")}" EquivalenciaDR="${numTipoCambio(dr.equivalencia)}" NumParcialidad="${dr.numParcialidad || 1}" ` +
    `ImpSaldoAnt="${num(dr.impSaldoAnterior, 2)}" ImpPagado="${num(dr.impPagado, 2)}" ` +
    `ImpSaldoInsoluto="${num(dr.impSaldoInsoluto, 2)}" ObjetoImpDR="${escaparXml(dr.objetoImpDR || "02")}">` +
    (impuestosDRXml ? `<pago20:ImpuestosDR><pago20:TrasladosDR>${impuestosDRXml}</pago20:TrasladosDR></pago20:ImpuestosDR>` : "") +
    `</pago20:DoctoRelacionado>` +
    (impuestosPXml ? `<pago20:ImpuestosP><pago20:TrasladosP>${impuestosPXml}</pago20:TrasladosP></pago20:ImpuestosP>` : "") +
    `</pago20:Pago>` +
    `</pago20:Pagos>` +
    `</cfdi:Complemento>`
  );
}

/**
 * Arma el XML del CFDI 4.0 SIN timbrar (sin Sello/Certificado/NoCertificado
 * — eso lo completa el PAC). Valida el comprobante primero; si algo no
 * cumple el formato, lanza antes de generar una sola línea de XML.
 */
function construirXml(cfdi) {
  validarComprobante(cfdi);

  const esPago = cfdi.tipoComprobante === "P" && cfdi.pago;

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
    // El concepto genérico "Pago" de un Complemento de Pago exige Cantidad,
    // ValorUnitario e Importe literales "1"/"0"/"0", sin decimales — igual
    // que SubTotal/Total del comprobante (ver CRP20103/CRP20115 más abajo).
    const cantidadAttr = esPago ? "1" : num(c.cantidad, 6);
    const valorUnitarioAttr = esPago ? "0" : num(c.valorUnitario, 6);
    const importeAttr = esPago ? "0" : num(c.importe, 6);

    return (
      `<cfdi:Concepto ClaveProdServ="${escaparXml(c.claveProdServ)}" Cantidad="${cantidadAttr}" ` +
      `ClaveUnidad="${escaparXml(c.claveUnidad)}"${unidadAttr} Descripcion="${escaparXml(c.descripcion)}" ` +
      `ValorUnitario="${valorUnitarioAttr}" Importe="${importeAttr}"${descuentoAttr} ObjetoImp="${escaparXml(c.objetoImpuesto)}">` +
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

  // El namespace Y la URL del esquema público de un complemento (ej.
  // pago20) deben declararse en el nodo RAÍZ <cfdi:Comprobante>, no solo en
  // el nodo del propio complemento — es sintácticamente válido en XML
  // declararlo más abajo, pero el validador de Dinvbox lo rechaza igual
  // (errores CO1002/CO1003) si no está también arriba, que es como lo hacen
  // los ejemplos oficiales del SAT.
  const pago20NsAttr = esPago ? ` xmlns:pago20="http://www.sat.gob.mx/Pagos20"` : "";
  const pago20SchemaLocation = esPago
    ? " http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd"
    : "";

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"${pago20NsAttr} ` +
    `xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd${pago20SchemaLocation}" ` +
    `Version="4.0"${serieAttr} Folio="${escaparXml(cfdi.folioInterno)}" Fecha="${formatearFecha(cfdi.fechaEmision)}" ` +
    // El SAT exige SubTotal/Total literalmente "0" (sin decimales) cuando el
    // comprobante trae el Complemento de Pago — "0.00" lo rechaza (error
    // CRP20103), aunque numéricamente sea el mismo valor. Y el atributo
    // FormaPago NO debe existir en la raíz en ese caso (error CRP20105) — la
    // forma de pago real va dentro de pago20:Pago, que ya la trae.
    `${esPago ? "" : `FormaPago="${escaparXml(cfdi.formaPago)}" `}SubTotal="${esPago ? "0" : num(cfdi.subtotal, 2)}"${descuentoAttr} ` +
    `Moneda="${escaparXml(cfdi.moneda)}" Total="${esPago ? "0" : num(cfdi.total, 2)}" ` +
    // Mismo caso que FormaPago arriba: MetodoPago tampoco debe existir en la
    // raíz de un comprobante con Complemento de Pago (error CRP20106).
    `TipoDeComprobante="${escaparXml(cfdi.tipoComprobante)}" Exportacion="01"${esPago ? "" : ` MetodoPago="${escaparXml(cfdi.metodoPago)}"`} ` +
    `LugarExpedicion="${escaparXml(cfdi.lugarExpedicion)}">` +
    `<cfdi:Emisor Rfc="${escaparXml(cfdi.emisor.rfc)}" Nombre="${escaparXml(cfdi.emisor.nombre)}" RegimenFiscal="${escaparXml(cfdi.emisor.regimenFiscal)}"/>` +
    `<cfdi:Receptor Rfc="${escaparXml(cfdi.receptor.rfc)}" Nombre="${escaparXml(cfdi.receptor.nombre)}" ` +
    `DomicilioFiscalReceptor="${escaparXml(cfdi.receptor.codigoPostal)}" RegimenFiscalReceptor="${escaparXml(cfdi.receptor.regimenFiscal)}" ` +
    `UsoCFDI="${escaparXml(cfdi.receptor.usoCFDI)}"/>` +
    `<cfdi:Conceptos>${conceptosXml}</cfdi:Conceptos>` +
    impuestosResumenXml +
    (cfdi.tipoComprobante === "P" && cfdi.pago ? construirComplementoPago(cfdi) : "") +
    `</cfdi:Comprobante>`;

  return xml;
}

module.exports = { validarComprobante, construirXml, agruparImpuestos, escaparXml, formatearFecha, RFC_REGEX, CP_REGEX };

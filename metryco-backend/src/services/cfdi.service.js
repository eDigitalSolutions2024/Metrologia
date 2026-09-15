const mongoose = require("mongoose");
const ComprobanteFiscal = require("../models/ComprobanteFiscal");
const Cliente = require("../models/Cliente");
const Factura = require("../models/Factura");
const Cotizacion = require("../models/Cotizacion");
const Reporte = require("../models/Reporte");
const AppError = require("../utils/AppError");
const { siguienteFolio } = require("../utils/folio");
const configuracionService = require("./configuracion.service");
const { obtenerPac } = require("./pac/pacFactory");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);
const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const ESTADOS_EDITABLES = ["borrador", "error_timbrado"];
const ESTADOS_TIMBRABLES = ["borrador", "pendiente_timbrar", "error_timbrado"];

/**
 * Recalcula subtotal/impuestos/total SIEMPRE en el backend a partir de
 * `conceptos` — nunca se confía en totales que mande el frontend (podrían
 * venir manipulados o simplemente desincronizados de un cálculo en el
 * cliente con otro redondeo).
 */
function calcularTotales(conceptos) {
  let subtotal = 0;
  let totalImpuestosTrasladados = 0;
  let totalImpuestosRetenidos = 0;
  let descuento = 0;

  const conceptosCalculados = conceptos.map((c) => {
    const importeBruto = redondear(Number(c.cantidad) * Number(c.valorUnitario));
    const desc = redondear(Number(c.descuento) || 0);
    const importe = redondear(importeBruto - desc);
    subtotal += importe;
    descuento += desc;

    // "01" (No objeto de impuesto) NUNCA debe llevar impuestos por definición
    // del catálogo SAT c_ObjetoImp — si el request trae `impuestos` de
    // cualquier forma (a mano, vía API directa, un bug del frontend), se
    // ignoran aquí en vez de cobrarlos por error. Solo "02"/"03" los aplican.
    const impuestosCalculados = c.objetoImpuesto === "01"
      ? []
      : (c.impuestos || []).map((imp) => {
          const base = redondear(importe);
          const importeImp = redondear(base * Number(imp.tasaOCuota));
          if (imp.tipo === "traslado") totalImpuestosTrasladados += importeImp;
          else totalImpuestosRetenidos += importeImp;
          return { ...imp, base, importe: importeImp };
        });

    return { ...c, importe, descuento: desc, impuestos: impuestosCalculados };
  });

  subtotal = redondear(subtotal);
  totalImpuestosTrasladados = redondear(totalImpuestosTrasladados);
  totalImpuestosRetenidos = redondear(totalImpuestosRetenidos);
  descuento = redondear(descuento);
  const total = redondear(subtotal + totalImpuestosTrasladados - totalImpuestosRetenidos);

  return { conceptos: conceptosCalculados, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total };
}

/**
 * Datos fiscales del emisor (laboratorio). Si régimen fiscal o CP fiscal no
 * están configurados en Administración, NO se puede generar ni un borrador
 * válido de CFDI — se avisa exactamente qué falta en vez de dejarlo vacío
 * (un CFDI real sin esos datos lo rechazaría el PAC de todas formas).
 */
async function obtenerEmisorFiscal() {
  const lab = await configuracionService.obtenerLaboratorio();
  const faltantes = [];
  if (!lab.rfc) faltantes.push("RFC del laboratorio");
  if (!lab.regimenFiscal) faltantes.push("Régimen fiscal del laboratorio");
  if (!lab.codigoPostalFiscal) faltantes.push("Código postal fiscal (lugar de expedición)");
  if (faltantes.length) {
    throw new AppError(
      `Faltan datos fiscales del emisor en Administración → Datos del Laboratorio: ${faltantes.join(", ")}`,
      409
    );
  }
  return { rfc: lab.rfc, nombre: lab.nombre, regimenFiscal: lab.regimenFiscal, codigoPostalFiscal: lab.codigoPostalFiscal, serieCFDI: lab.serieCFDI };
}

async function obtenerReceptorFiscal(clienteId) {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);
  const faltantes = [];
  if (!cliente.rfc) faltantes.push("RFC");
  if (!cliente.regimenFiscal) faltantes.push("Régimen fiscal");
  if (!cliente.usoCFDI) faltantes.push("Uso de CFDI");
  if (!cliente.domicilioFiscal?.cp) faltantes.push("Código postal fiscal");
  if (faltantes.length) {
    throw new AppError(
      `Faltan datos fiscales del cliente "${cliente.nombre}" para generar el CFDI: ${faltantes.join(", ")}`,
      409
    );
  }
  return {
    rfc: cliente.rfc,
    nombre: cliente.nombre,
    codigoPostal: cliente.domicilioFiscal.cp,
    regimenFiscal: cliente.regimenFiscal,
    usoCFDI: cliente.usoCFDI,
  };
}

async function listar({ clienteId = "", estado = "", page = 0, pageSize = 20 } = {}) {
  const match = {};
  if (clienteId && oid(clienteId)) match.cliente = oid(clienteId);
  if (estado) match.estado = estado;

  const [items, total] = await Promise.all([
    ComprobanteFiscal.find(match)
      .populate("cliente", "nombre rfc")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    ComprobanteFiscal.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const cfdi = await ComprobanteFiscal.findById(id).populate("cliente", "nombre rfc");
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  return cfdi;
}

async function crear(datos, usuarioId) {
  if (!oid(datos.cliente)) throw new AppError("Cliente inválido", 400);

  // Ligas opcionales — si se mandan, deben apuntar a un registro real (evita
  // guardar una referencia rota por un id con formato válido pero inexistente).
  const [emisor, receptor] = await Promise.all([
    obtenerEmisorFiscal(),
    obtenerReceptorFiscal(datos.cliente),
    datos.factura && oid(datos.factura)
      ? Factura.exists({ _id: datos.factura }).then((ok) => { if (!ok) throw new AppError("Factura no encontrada", 404); })
      : null,
    datos.cotizacion && oid(datos.cotizacion)
      ? Cotizacion.exists({ _id: datos.cotizacion }).then((ok) => { if (!ok) throw new AppError("Cotización no encontrada", 404); })
      : null,
    datos.reporte && oid(datos.reporte)
      ? Reporte.exists({ _id: datos.reporte }).then((ok) => { if (!ok) throw new AppError("Reporte no encontrado", 404); })
      : null,
  ]);

  const { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total } =
    calcularTotales(datos.conceptos);

  const folioInterno = await siguienteFolio("CFDI");

  const cfdi = await ComprobanteFiscal.create({
    factura: datos.factura || undefined,
    cotizacion: datos.cotizacion || undefined,
    reporte: datos.reporte || undefined,
    cliente: datos.cliente,
    folioInterno,
    serie: datos.serie || emisor.serieCFDI || undefined,
    tipoComprobante: datos.tipoComprobante || "I",
    moneda: datos.moneda || "MXN",
    formaPago: datos.formaPago,
    metodoPago: datos.metodoPago || "PUE",
    lugarExpedicion: emisor.codigoPostalFiscal,
    emisor: { rfc: emisor.rfc, nombre: emisor.nombre, regimenFiscal: emisor.regimenFiscal },
    receptor,
    conceptos,
    subtotal,
    totalImpuestosTrasladados,
    totalImpuestosRetenidos,
    descuento,
    total,
    estado: "borrador",
    comentarios: datos.comentarios,
    registradoPor: usuarioId,
  });

  return cfdi.populate("cliente", "nombre rfc");
}

async function actualizar(id, datos) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!ESTADOS_EDITABLES.includes(cfdi.estado)) {
    throw new AppError(`No se puede editar un comprobante en estado "${cfdi.estado}"`, 409);
  }

  if (datos.cliente && String(datos.cliente) !== String(cfdi.cliente)) {
    cfdi.cliente = datos.cliente;
    cfdi.receptor = await obtenerReceptorFiscal(datos.cliente);
  }
  for (const campo of ["serie", "tipoComprobante", "moneda", "formaPago", "metodoPago", "comentarios"]) {
    if (datos[campo] !== undefined) cfdi[campo] = datos[campo];
  }
  if (Array.isArray(datos.conceptos) && datos.conceptos.length) {
    const { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total } =
      calcularTotales(datos.conceptos);
    Object.assign(cfdi, { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total });
  }
  // Reintentar después de un error de timbrado regresa a borrador, no se
  // queda atorado en "error_timbrado" para siempre.
  if (cfdi.estado === "error_timbrado") cfdi.estado = "borrador";

  await cfdi.save();
  return cfdi.populate("cliente", "nombre rfc");
}

/**
 * Timbra ante el PAC configurado. Si no hay PAC configurado, lanza
 * PacNotConfiguredError (503, code PAC_NOT_CONFIGURED) — NUNCA marca el
 * comprobante como timbrado sin una respuesta real del proveedor.
 */
async function timbrar(id, usuarioId) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!ESTADOS_TIMBRABLES.includes(cfdi.estado)) {
    throw new AppError(`No se puede timbrar un comprobante en estado "${cfdi.estado}"`, 409);
  }

  // Se revisa el PAC ANTES de tocar el estado — si no está configurado, el
  // comprobante se queda intacto en borrador, no "timbrando" para siempre.
  const pac = obtenerPac();

  cfdi.estado = "timbrando";
  await cfdi.save();

  try {
    const resultado = await pac.timbrarFactura(cfdi.toObject());
    cfdi.estado = "timbrada";
    cfdi.uuid = resultado.uuid;
    cfdi.xml = resultado.xml;
    cfdi.selloSat = resultado.selloSat;
    cfdi.cadenaOriginal = resultado.cadenaOriginal;
    cfdi.fechaTimbrado = resultado.fechaTimbrado || new Date();
    cfdi.errorTimbrado = undefined;
    await cfdi.save();
    return cfdi.populate("cliente", "nombre rfc");
  } catch (err) {
    cfdi.estado = "error_timbrado";
    cfdi.errorTimbrado = { codigo: err.code || "PAC_ERROR", mensaje: err.message, fecha: new Date() };
    await cfdi.save();
    throw err;
  }
}

async function cancelar(id, { motivo, folioSustitucion }) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (cfdi.estado !== "timbrada") {
    throw new AppError(`Solo se puede cancelar un comprobante timbrado (estado actual: "${cfdi.estado}")`, 409);
  }

  const pac = obtenerPac(); // lanza PacNotConfiguredError si no hay proveedor

  const resultado = await pac.cancelarFactura({ uuid: cfdi.uuid, motivo, folioSustitucion });
  cfdi.estado = "cancelada";
  cfdi.cancelacion = {
    motivo,
    folioSustitucion,
    fecha: resultado.fechaCancelacion || new Date(),
    acuseXml: resultado.acuseXml,
  };
  await cfdi.save();
  return cfdi.populate("cliente", "nombre rfc");
}

async function obtenerXml(id) {
  const cfdi = await ComprobanteFiscal.findById(id).select("xml estado folioInterno");
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!cfdi.xml) throw new AppError("Este comprobante todavía no tiene XML timbrado", 409);
  return { xml: cfdi.xml, nombre: `${cfdi.folioInterno}.xml` };
}

async function obtenerPdf(id) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!cfdi.uuid) throw new AppError("Este comprobante todavía no está timbrado", 409);
  const pac = obtenerPac(); // el PDF fiscal lo genera/devuelve el PAC, no este sistema
  const buffer = await pac.obtenerPdf(cfdi.uuid);
  return { buffer, nombre: `${cfdi.folioInterno}.pdf` };
}

module.exports = {
  calcularTotales, listar, obtener, crear, actualizar, timbrar, cancelar, obtenerXml, obtenerPdf,
  obtenerEmisorFiscal, obtenerReceptorFiscal,
};

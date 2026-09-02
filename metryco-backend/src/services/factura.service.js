const mongoose = require("mongoose");
const Factura = require("../models/Factura");
const Cliente = require("../models/Cliente");
const Cotizacion = require("../models/Cotizacion");
const AppError = require("../utils/AppError");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + Number(dias));
  return d;
}

// El frontend arma las 3 pestañas (Atrasadas / Por Pagar / Pagadas) filtrando
// en el cliente sobre el arreglo completo — igual que hacía con el mock — así
// que aquí no se pagina, solo se filtra por cliente si se pide.
async function listar({ clienteId = "" } = {}) {
  const match = {};
  if (clienteId && oid(clienteId)) match.cliente = oid(clienteId);
  return Factura.find(match).populate("cliente", "nombre").sort({ fechaPago: 1 });
}

async function crear(datos, usuarioId) {
  if (!datos.cliente || !oid(datos.cliente)) throw new AppError("Cliente inválido", 400);
  if (!(await Cliente.exists({ _id: datos.cliente }))) throw new AppError("Cliente no encontrado", 404);
  if (!datos.oc || !datos.folio) throw new AppError("OC y folio son obligatorios", 400);
  if (!datos.fechaCr) throw new AppError("La fecha C/R es obligatoria", 400);

  const factura = await Factura.create({
    cliente: datos.cliente,
    cotizacion: datos.cotizacion || undefined,
    oc: datos.oc,
    folio: datos.folio,
    monto: datos.monto,
    fechaCr: datos.fechaCr,
    diasPago: datos.diasPago ?? 30,
    fechaPago: sumarDias(datos.fechaCr, datos.diasPago ?? 30),
    comentarios: datos.comentarios,
    registradoPor: usuarioId,
  });

  // Si la factura viene de una cotización aprobada, se marca como facturada
  // — así queda claro que ya no está "solo aprobada esperando facturarse".
  if (datos.cotizacion && oid(datos.cotizacion)) {
    await Cotizacion.updateOne({ _id: datos.cotizacion }, { status: "facturada" });
  }

  return factura.populate("cliente", "nombre");
}

async function aplicarPago(id, fechaPagada) {
  const factura = await Factura.findByIdAndUpdate(
    id,
    { statusPago: 1, fechaPagada: fechaPagada || new Date() },
    { new: true }
  ).populate("cliente", "nombre");
  if (!factura) throw new AppError("Factura no encontrada", 404);
  return factura;
}

async function reabrir(id) {
  const factura = await Factura.findByIdAndUpdate(
    id,
    { statusPago: 0, fechaPagada: null },
    { new: true }
  ).populate("cliente", "nombre");
  if (!factura) throw new AppError("Factura no encontrada", 404);
  return factura;
}

async function eliminar(id) {
  const factura = await Factura.findByIdAndDelete(id);
  if (!factura) throw new AppError("Factura no encontrada", 404);
  return factura;
}

module.exports = { listar, crear, aplicarPago, reabrir, eliminar };

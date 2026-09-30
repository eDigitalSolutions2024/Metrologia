const mongoose = require("mongoose");
const Factura = require("../models/Factura");
const { redondear, saldoDe } = require("../utils/saldoFactura");
const Cliente = require("../models/Cliente");
const Cotizacion = require("../models/Cotizacion");
const Reporte = require("../models/Reporte");
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
  // Las facturas timbradas en el sistema ya crean su cuenta por cobrar solas;
  // este alta manual es para facturas hechas fuera — no debe duplicar una existente.
  if (await Factura.exists({ cliente: datos.cliente, folio: String(datos.folio).trim() })) {
    throw new AppError(`Ya existe una cuenta por cobrar con el folio "${datos.folio}" para este cliente. Si esa factura se timbró en el sistema, su cuenta se crea sola.`, 409);
  }

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
  // También se refleja en el Reporte que nació de esa cotización (campo de
  // texto libre que se ve en el detalle del reporte) — sin esto, Cobranza y
  // Reportes quedaban con la factura desconectada entre sí.
  if (datos.cotizacion && oid(datos.cotizacion)) {
    await Cotizacion.updateOne({ _id: datos.cotizacion }, { status: "facturada" });
    await Reporte.updateOne({ cotizacion: datos.cotizacion }, { factura: datos.folio });
  }

  return factura.populate("cliente", "nombre");
}

// Deja statusPago/fechaPagada coherentes con los abonos: pagada solo cuando el saldo llega a 0.
function sincronizarEstado(factura) {
  const abonos = factura.abonos || [];
  const pagada = redondear(factura.monto - abonos.reduce((s, a) => s + a.monto, 0)) <= 0 && abonos.length > 0;
  factura.statusPago = pagada ? 1 : 0;
  factura.fechaPagada = pagada
    ? abonos.reduce((max, a) => (a.fecha > max ? a.fecha : max), abonos[0].fecha)
    : null;
}

async function obtenerCuenta(id) {
  const factura = await Factura.findById(id);
  if (!factura) throw new AppError("Factura no encontrada", 404);
  return factura;
}

function exigirCobroManual(factura) {
  if (factura.requiereComplemento) {
    throw new AppError(
      "Esta factura es a parcialidades (PPD) y se cobra registrando el Complemento de Pago en Facturación — ahí se fiscaliza el pago y esta cuenta se actualiza sola.",
      409
    );
  }
}

async function registrarAbono(id, { monto, fecha, nota }, usuarioId) {
  const factura = await obtenerCuenta(id);
  if (factura.statusPago === 1) throw new AppError("Esta cuenta ya está pagada", 409);
  exigirCobroManual(factura);
  const saldo = saldoDe(factura);
  if (monto > saldo + 0.005) throw new AppError(`El abono ($${monto}) no puede ser mayor al saldo ($${saldo})`, 400);
  factura.abonos.push({ fecha: fecha || new Date(), monto: redondear(monto), nota, registradoPor: usuarioId });
  sincronizarEstado(factura);
  await factura.save();
  return factura.populate("cliente", "nombre");
}

// "Aplicar pago": liquida lo que falta de una sola vez (registra el resto como último abono).
async function aplicarPago(id, fechaPagada, usuarioId) {
  const factura = await obtenerCuenta(id);
  exigirCobroManual(factura);
  const fecha = fechaPagada || new Date();
  const saldo = saldoDe(factura);
  if (saldo > 0) {
    factura.abonos.push({ fecha, monto: saldo, nota: "Liquidación", registradoPor: usuarioId });
    sincronizarEstado(factura);
  } else {
    factura.statusPago = 1;
    factura.fechaPagada = fecha;
  }
  await factura.save();
  return factura.populate("cliente", "nombre");
}

// Reabrir quita los abonos manuales; los que vienen de un Complemento de Pago
// reflejan un hecho fiscal y solo se retiran cancelando ese complemento.
async function reabrir(id) {
  const factura = await obtenerCuenta(id);
  factura.abonos = factura.abonos.filter((a) => a.comprobante);
  if (factura.abonos.length && redondear(factura.monto - factura.abonos.reduce((s, a) => s + a.monto, 0)) <= 0) {
    throw new AppError("Esta cuenta está pagada por Complementos de Pago timbrados; para reabrirla hay que cancelar el complemento en Facturación.", 409);
  }
  factura.statusPago = 0;
  factura.fechaPagada = null;
  await factura.save();
  return factura.populate("cliente", "nombre");
}

async function eliminarAbono(id, abonoId) {
  const factura = await obtenerCuenta(id);
  const abono = factura.abonos.id(abonoId);
  if (!abono) throw new AppError("Abono no encontrado", 404);
  if (abono.comprobante) throw new AppError("Este abono viene de un Complemento de Pago; se retira cancelando el complemento.", 409);
  abono.deleteOne();
  sincronizarEstado(factura);
  await factura.save();
  return factura.populate("cliente", "nombre");
}

// --- Enlace con Facturación: un Complemento de Pago timbrado es un abono de la cuenta de su factura.
async function abonarDesdeComplemento(comprobanteOriginalId, complemento) {
  const factura = await Factura.findOne({ comprobante: comprobanteOriginalId });
  if (!factura) return;
  if (factura.abonos.some((a) => String(a.comprobante) === String(complemento._id))) return;
  factura.abonos.push({
    fecha: complemento.pago?.fechaPago || new Date(),
    monto: complemento.pago?.monto,
    comprobante: complemento._id,
    nota: `Complemento de Pago ${complemento.folioInterno}`,
  });
  sincronizarEstado(factura);
  await factura.save();
}

async function retirarAbonoDeComplemento(complementoId) {
  const factura = await Factura.findOne({ "abonos.comprobante": complementoId });
  if (!factura) return;
  factura.abonos = factura.abonos.filter((a) => String(a.comprobante) !== String(complementoId));
  sincronizarEstado(factura);
  await factura.save();
}

async function eliminar(id) {
  const factura = await Factura.findByIdAndDelete(id);
  if (!factura) throw new AppError("Factura no encontrada", 404);
  return factura;
}

module.exports = {
  listar, crear, aplicarPago, reabrir, eliminar,
  registrarAbono, eliminarAbono, abonarDesdeComplemento, retirarAbonoDeComplemento,
};

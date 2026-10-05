const mongoose = require("mongoose");
const ComprobanteFiscal = require("../models/ComprobanteFiscal");
const Cotizacion = require("../models/Cotizacion");
const AppError = require("../utils/AppError");

const redondear = (n) => Math.round(n * 1e6) / 1e6;

/**
 * Avance de facturación de cotizaciones, PARTIDA POR PARTIDA. Cada concepto de
 * un CFDI de Ingreso recuerda de qué partida viene (`partidaCotizacion`); lo ya
 * facturado de una partida es la suma de esos conceptos en CFDI no cancelados
 * (borradores incluidos, para no facturar dos veces lo mismo).
 *
 * Los CFDI ligados a una cotización ANTES de existir esto no traen partida en
 * sus conceptos: si hay alguno, la cotización se da por facturada completa.
 */
async function avanceVarios(cotizaciones, { excluirCfdiId } = {}) {
  const base = {
    cotizacion: { $in: cotizaciones.map((c) => c._id) },
    tipoComprobante: "I",
    estado: { $ne: "cancelada" },
  };
  if (excluirCfdiId) base._id = { $ne: new mongoose.Types.ObjectId(String(excluirCfdiId)) };

  const [sumas, legado] = await Promise.all([
    ComprobanteFiscal.aggregate([
      { $match: base },
      { $unwind: "$conceptos" },
      { $match: { "conceptos.partidaCotizacion": { $ne: null } } },
      { $group: { _id: { cot: "$cotizacion", idx: "$conceptos.partidaCotizacion" }, facturada: { $sum: "$conceptos.cantidad" } } },
    ]),
    ComprobanteFiscal.aggregate([
      { $match: base },
      { $match: { conceptos: { $not: { $elemMatch: { partidaCotizacion: { $ne: null } } } } } },
      { $group: { _id: "$cotizacion", n: { $sum: 1 } } },
    ]),
  ]);

  const facturadaPor = new Map(sumas.map((s) => [`${s._id.cot}:${s._id.idx}`, s.facturada]));
  const conLegado = new Set(legado.map((l) => String(l._id)));

  const mapa = new Map();
  for (const c of cotizaciones) {
    const esLegado = conLegado.has(String(c._id));
    const items = (c.items || []).map((it, idx) => {
      const facturada = esLegado ? it.cantidad : facturadaPor.get(`${c._id}:${idx}`) || 0;
      return { idx, descripcion: it.descripcion, cantidad: it.cantidad, facturada, pendiente: Math.max(0, redondear(it.cantidad - facturada)) };
    });
    const partidasCompletas = items.filter((i) => i.pendiente <= 0).length;
    const completa = items.length > 0 && partidasCompletas === items.length;
    const hayAlgo = esLegado || items.some((i) => i.facturada > 0);
    mapa.set(String(c._id), {
      items, completa, parcial: hayAlgo && !completa, partidasFacturadas: partidasCompletas, partidasTotal: items.length,
    });
  }
  return mapa;
}

async function avance(cotizacionId, opciones) {
  const cot = await Cotizacion.findById(cotizacionId).select("status items").lean();
  if (!cot) throw new AppError("Cotización no encontrada", 404);
  return (await avanceVarios([cot], opciones)).get(String(cot._id));
}

/** La cotización queda "facturada" solo si ya no queda nada por facturar; si no, "aprobada". */
async function sincronizarEstado(cotizacionId) {
  const cot = await Cotizacion.findById(cotizacionId).select("status items").lean();
  if (!cot || !["aprobada", "facturada"].includes(cot.status)) return;
  const av = (await avanceVarios([cot])).get(String(cot._id));
  const nuevo = av.completa ? "facturada" : "aprobada";
  if (nuevo !== cot.status) await Cotizacion.updateOne({ _id: cot._id }, { status: nuevo });
}

/** Rechaza facturar más de lo que queda pendiente de una partida. */
async function validarPartidas(cotizacionId, conceptos, { excluirCfdiId } = {}) {
  const etiquetados = conceptos.filter((c) => c.partidaCotizacion !== undefined && c.partidaCotizacion !== null);
  if (!cotizacionId || etiquetados.length === 0) return;
  const av = await avance(cotizacionId, { excluirCfdiId });
  const pedido = new Map();
  for (const c of etiquetados) pedido.set(c.partidaCotizacion, (pedido.get(c.partidaCotizacion) || 0) + Number(c.cantidad));
  for (const [idx, cantidad] of pedido) {
    const partida = av.items[idx];
    if (!partida) throw new AppError(`La partida #${idx + 1} no existe en la cotización`, 400);
    if (cantidad > partida.pendiente + 1e-6) {
      throw new AppError(
        `La partida "${partida.descripcion}" solo tiene ${partida.pendiente} por facturar (se intentan facturar ${cantidad}).`,
        409
      );
    }
  }
}

module.exports = { avanceVarios, avance, sincronizarEstado, validarPartidas };

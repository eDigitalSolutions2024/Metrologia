const mongoose = require("mongoose");
const Asignacion = require("../models/Asignacion");
const Reporte = require("../models/Reporte");
const Equipo = require("../models/Equipo");
const Patron = require("../models/Patron");
const AppError = require("../utils/AppError");
const { crearEvento } = require("../utils/historial");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/** Avisos sobre los patrones elegidos (vencidos / no activos). No bloquea. */
async function avisosPatrones(ids = []) {
  const _ids = ids.map(oid).filter(Boolean);
  if (!_ids.length) return [];
  const patrones = await Patron.find({ _id: { $in: _ids } });
  const avisos = [];
  for (const p of patrones) {
    const v = p.estadoVigencia();
    if (v === "vencido") avisos.push(`El patrón ${p.codigo} está VENCIDO — no podrás emitir el certificado con él.`);
    else if (v === "por_vencer") avisos.push(`El patrón ${p.codigo} vence pronto.`);
    if (p.estado !== "activo") avisos.push(`El patrón ${p.codigo} no está activo (${p.estado}).`);
  }
  return avisos;
}

async function listar({ reporteId = "", estadoCertificado = "", estadoCalibracion = "", page = 0, pageSize = 20 }) {
  const match = {};
  if (reporteId && oid(reporteId)) match.reporte = oid(reporteId);
  if (estadoCertificado) match["estados.certificado"] = estadoCertificado;
  if (estadoCalibracion) match["estados.calibracion"] = estadoCalibracion;

  const [items, total] = await Promise.all([
    Asignacion.find(match)
      .populate("equipo", "idInterno marca modelo serie categoria")
      .populate("reporte", "folio cliente")
      .populate("tecnicoAsignado", "nombre usuario")
      .populate("tecnicoEjecutor", "nombre usuario")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Asignacion.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const a = await Asignacion.findById(id)
    .populate("equipo")
    .populate("reporte", "folio cliente status")
    .populate("tecnicoAsignado", "nombre usuario")
    .populate("tecnicoEjecutor", "nombre usuario")
    .populate("patrones", "codigo nombre trazabilidad incertidumbre")
    .populate("performance", "nombre magnitud tipoInstrumento")
    .populate("historial.usuario.id", "nombre usuario");
  if (!a) throw new AppError("Asignación no encontrada", 404);
  return a;
}

async function crear(datos, reqUser) {
  if (!oid(datos.reporte)) throw new AppError("Reporte inválido", 400);
  if (!oid(datos.equipo)) throw new AppError("Equipo inválido", 400);
  if (!(await Reporte.exists({ _id: datos.reporte }))) throw new AppError("Reporte no encontrado", 404);
  if (!(await Equipo.exists({ _id: datos.equipo }))) throw new AppError("Equipo no encontrado", 404);

  const evento = await crearEvento(reqUser, "asignacion_creada", {});
  const a = await Asignacion.create({
    reporte: datos.reporte,
    equipo: datos.equipo,
    tecnicoAsignado: datos.tecnicoAsignado || undefined,
    patrones: (datos.patrones || []).filter(oid),
    performance: datos.performance || undefined,
    historial: [evento],
  });

  // El reporte pasa a "en_proceso" en cuanto tiene su primera asignación.
  await Reporte.updateOne(
    { _id: datos.reporte, status: "recepcion" },
    { $set: { status: "en_proceso" } }
  );

  const out = a.toObject();
  out.advertencias = await avisosPatrones(datos.patrones);
  return out;
}

async function actualizar(id, datos, reqUser) {
  const a = await Asignacion.findById(id);
  if (!a) throw new AppError("Asignación no encontrada", 404);

  if (datos.tecnicoAsignado !== undefined) a.tecnicoAsignado = datos.tecnicoAsignado || undefined;
  if (Array.isArray(datos.patrones)) a.patrones = datos.patrones.filter(oid);
  if (datos.performance !== undefined) a.performance = datos.performance || undefined;
  if (datos.fechaCalibracion) a.fechaCalibracion = datos.fechaCalibracion;

  a.historial.push(await crearEvento(reqUser, "asignacion_editada", {}));
  await a.save();
  const out = a.toObject();
  out.advertencias = await avisosPatrones(a.patrones);
  return out;
}

/**
 * Transición de estado de la asignación. Cualquiera puede iniciarla; el sistema
 * registra automáticamente QUIÉN fue el técnico ejecutor y cuándo.
 */
async function cambiarEstado(id, { dominio, valor, motivo }, reqUser) {
  const a = await Asignacion.findById(id);
  if (!a) throw new AppError("Asignación no encontrada", 404);

  const enums = {
    calibracion: Asignacion.EST_CALIBRACION,
    entrega: Asignacion.EST_ENTREGA,
    certificado: Asignacion.EST_CERTIFICADO,
  };
  if (!enums[dominio]) throw new AppError("Dominio de estado inválido", 400);
  if (!enums[dominio].includes(valor)) throw new AppError(`Valor inválido para ${dominio}`, 400);

  const anterior = a.estados[dominio];
  a.estados[dominio] = valor;

  if (dominio === "calibracion") {
    if (valor === "en_proceso" && !a.tecnicoEjecutor) a.tecnicoEjecutor = reqUser?.id;
    if (valor === "terminada") {
      if (!a.tecnicoEjecutor) a.tecnicoEjecutor = reqUser?.id;
      if (!a.fechaCalibracion) a.fechaCalibracion = new Date();
    }
  }
  if (dominio === "entrega" && valor === "entregado" && !a.fechaEntrega) {
    a.fechaEntrega = new Date();
  }
  if (dominio === "certificado" && valor === "rechazado") {
    a.motivoRechazo = motivo || "";
  }

  a.historial.push(
    await crearEvento(reqUser, `estado.${dominio}: ${anterior} → ${valor}`, motivo ? { motivo } : undefined)
  );
  await a.save();
  return a;
}

async function eliminar(id) {
  const a = await Asignacion.findByIdAndDelete(id);
  if (!a) throw new AppError("Asignación no encontrada", 404);
  return a;
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };

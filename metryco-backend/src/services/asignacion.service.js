const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Asignacion = require("../models/Asignacion");
const Reporte = require("../models/Reporte");
const Equipo = require("../models/Equipo");
const Patron = require("../models/Patron");
const AppError = require("../utils/AppError");
const { crearEvento } = require("../utils/historial");
const { destinoGraficas } = require("../middleware/upload");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

async function listar({ reporteId = "", estadoCertificado = "", estadoCalibracion = "", tecnicoAsignado = "", page = 0, pageSize = 20 }) {
  const match = {};
  if (reporteId && oid(reporteId)) match.reporte = oid(reporteId);
  if (estadoCertificado) match["estados.certificado"] = estadoCertificado;
  if (estadoCalibracion) match["estados.calibracion"] = estadoCalibracion;
  if (tecnicoAsignado && oid(tecnicoAsignado)) match.tecnicoAsignado = oid(tecnicoAsignado);

  const [items, total] = await Promise.all([
    Asignacion.find(match)
      .populate("equipo", "idInterno marca modelo serie categoria descripcion")
      .populate({ path: "reporte", select: "folio cliente status", populate: { path: "cliente", select: "nombre" } })
      .populate("tecnicoAsignado", "nombre usuario")
      .populate("tecnicoEjecutor", "nombre usuario")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Asignacion.countDocuments(match),
  ]);
  return { items, total };
}

/**
 * Cola de Calidad (legacy: `calidad_buscar.php`, WHERE status_calidad IN ('0','2')).
 * Muestra asignaciones con la calibración ya terminada que todavía no están
 * autorizadas — incluye las nunca revisadas (sin_generar/en_revision) y las
 * rechazadas que el técnico ya volvió a terminar. Una vez autorizada, sale
 * de la cola para siempre (igual que en el legacy).
 */
async function listarParaCalidad({ clienteId = "" } = {}) {
  const match = {
    "estados.calibracion": "terminada",
    "estados.certificado": { $ne: "autorizado" },
  };

  const items = await Asignacion.find(match)
    .populate("equipo", "idInterno marca modelo serie categoria descripcion")
    .populate({
      path: "reporte",
      select: "folio cliente",
      populate: { path: "cliente", select: "nombre" },
      ...(clienteId && oid(clienteId) ? { match: { cliente: oid(clienteId) } } : {}),
    })
    .populate("tecnicoAsignado", "nombre usuario")
    .populate("tecnicoEjecutor", "nombre usuario")
    .sort({ updatedAt: -1 });

  // Si se filtró por cliente, el populate con `match` deja `reporte: null` en
  // las que no son de ese cliente — se descartan aquí.
  return clienteId ? items.filter((a) => a.reporte) : items;
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

  // Un mismo equipo no se asigna dos veces al mismo reporte.
  if (await Asignacion.exists({ reporte: datos.reporte, equipo: datos.equipo })) {
    throw new AppError("Ese equipo ya está asignado en este reporte", 409);
  }

  const patrones = (datos.patrones || []).filter(oid);
  if (patrones.length) {
    const vencido = await Patron.findOne({
      _id: { $in: patrones },
      "ultimaCalibracion.vencimiento": { $lt: new Date() },
    }).select("codigo nombre");
    if (vencido) {
      throw new AppError(`El patrón ${vencido.codigo} (${vencido.nombre}) está vencido y no puede usarse`, 409);
    }
  }

  const evento = await crearEvento(reqUser, "asignacion_creada", {});
  const a = await Asignacion.create({
    reporte: datos.reporte,
    equipo: datos.equipo,
    tecnicoAsignado: datos.tecnicoAsignado || undefined,
    patrones,
    performance: datos.performance || undefined,
    historial: [evento],
  });

  // El reporte pasa a "en_proceso" en cuanto tiene su primera asignación.
  await Reporte.updateOne(
    { _id: datos.reporte, status: "recepcion" },
    { $set: { status: "en_proceso" } }
  );
  return a;
}

async function actualizar(id, datos, reqUser) {
  const a = await Asignacion.findById(id);
  if (!a) throw new AppError("Asignación no encontrada", 404);

  if (datos.tecnicoAsignado !== undefined) a.tecnicoAsignado = datos.tecnicoAsignado || undefined;
  if (Array.isArray(datos.patrones)) a.patrones = datos.patrones.filter(oid);
  if (datos.performance !== undefined) a.performance = datos.performance || undefined;
  if (datos.fechaCalibracion) a.fechaCalibracion = datos.fechaCalibracion;
  if (datos.factura !== undefined) a.factura = datos.factura;

  let evento = "asignacion_editada";
  if (datos.recoleccion && typeof datos.recoleccion === "object") {
    const r = datos.recoleccion;
    if (r.enSitio !== undefined) a.recoleccion.enSitio = !!r.enSitio;
    if (r.enLaboratorio !== undefined) a.recoleccion.enLaboratorio = !!r.enLaboratorio;
    if (r.ubicacionInfo !== undefined) a.recoleccion.ubicacionInfo = r.ubicacionInfo;
    if (r.recolectado !== undefined) {
      a.recoleccion.recolectado = !!r.recolectado;
      evento = r.recolectado ? "equipo_recolectado" : evento;
    }
    if (r.infoRecoleccion !== undefined) a.recoleccion.infoRecoleccion = r.infoRecoleccion;
  }

  a.historial.push(await crearEvento(reqUser, evento, {}));
  await a.save();
  return a;
}

/**
 * Transición de estado de la asignación. Calibración/Entrega las mueve quien
 * ejecuta o supervisa el trabajo (técnico/coordinador/admin); Certificado
 * (aprobar/rechazar) es función exclusiva de Calidad (coordinador/admin) — el
 * sistema registra automáticamente QUIÉN fue el técnico ejecutor y cuándo.
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

  if (dominio === "certificado" && !["admin", "coordinador"].includes(reqUser?.rol)) {
    throw new AppError("Solo Calidad (Admin/Coordinador) puede autorizar o rechazar certificados", 403);
  }
  if (dominio === "certificado" && valor === "rechazado" && !motivo?.trim()) {
    throw new AppError("Indica el motivo del rechazo", 400);
  }

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

  const evento = await crearEvento(reqUser, `estado.${dominio}: ${anterior} → ${valor}`, motivo ? { motivo } : undefined);

  if (dominio === "certificado" && valor === "rechazado") {
    a.motivoRechazo = motivo.trim();
    a.historialRechazos.push({ motivo: motivo.trim(), usuario: { id: evento.usuario?.id, nombre: evento.usuario?.nombre } });
    // Igual que en el sistema original: rechazar regresa la calibración a
    // "pendiente" — el técnico debe rehacer el trabajo, no solo corregir el papeleo.
    a.estados.calibracion = "pendiente";
  }

  a.historial.push(evento);
  await a.save();
  return a;
}

async function eliminar(id) {
  const a = await Asignacion.findByIdAndDelete(id);
  if (!a) throw new AppError("Asignación no encontrada", 404);
  return a;
}

function rutaGrafica(asig) {
  if (!asig?.grafica?.nombreArchivo) return null;
  return path.join(destinoGraficas, asig.grafica.nombreArchivo);
}

async function subirGrafica(id, file, usuarioId) {
  if (!file) throw new AppError("No se recibió el archivo", 400);
  const asig = await Asignacion.findById(id);
  if (!asig) {
    fs.unlink(file.path, () => {});
    throw new AppError("Asignación no encontrada", 404);
  }

  const anterior = rutaGrafica(asig);
  if (anterior && fs.existsSync(anterior)) fs.unlink(anterior, () => {});

  asig.grafica = {
    nombreArchivo: file.filename,
    nombreOriginal: file.originalname,
    mimetype: file.mimetype,
    tamano: file.size,
    subidoPor: usuarioId,
    fecha: new Date(),
  };
  await asig.save();
  return asig;
}

async function archivoGraficaStream(id) {
  const asig = await Asignacion.findById(id);
  if (!asig) throw new AppError("Asignación no encontrada", 404);
  const ruta = rutaGrafica(asig);
  if (!ruta || !fs.existsSync(ruta)) throw new AppError("Esta asignación no tiene gráfica adjunta", 404);
  return { ruta, nombre: asig.grafica.nombreOriginal || `grafica-${id}` , mimetype: asig.grafica.mimetype };
}

module.exports = {
  listar, listarParaCalidad, obtener, crear, actualizar, cambiarEstado, eliminar,
  subirGrafica, archivoGraficaStream,
};

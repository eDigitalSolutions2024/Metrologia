const mongoose = require("mongoose");
const Reporte = require("../models/Reporte");
const Asignacion = require("../models/Asignacion");
const Cliente = require("../models/Cliente");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const { siguienteFolio } = require("../utils/folio");
const { crearEvento } = require("../utils/historial");
const configuracionService = require("./configuracion.service");

async function listar({ search = "", status = "todos", clienteId = "", mes = "", anio = "", page = 0, pageSize = 10 }) {
  const match = {};
  if (status && status !== "todos") match.status = status;
  if (clienteId && mongoose.isValidObjectId(clienteId)) {
    match.cliente = new mongoose.Types.ObjectId(clienteId);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ folio: rx }, { ordenCompra: rx }, { factura: rx }];
  }
  if (anio) {
    const y = Number(anio);
    const m = mes ? Number(mes) : null; // 1-12
    const desde = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
    const hasta = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
    match.fechaRecepcion = { $gte: desde, $lt: hasta };
  }

  const [items, total] = await Promise.all([
    Reporte.find(match)
      .populate("cliente", "nombre rfc")
      .populate("creadoPor", "nombre usuario")
      .populate("cotizacion", "folio items")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .lean(),
    Reporte.countDocuments(match),
  ]);

  // Conteo de asignaciones por reporte (columna "Cantidad Asignaciones").
  const ids = items.map((r) => r._id);
  const conteos = await Asignacion.aggregate([
    { $match: { reporte: { $in: ids } } },
    { $group: { _id: "$reporte", n: { $sum: 1 } } },
  ]);
  const mapa = Object.fromEntries(conteos.map((c) => [String(c._id), c.n]));
  items.forEach((r) => {
    r.numEquipos = mapa[String(r._id)] || 0;
    // "Cantidad en Proceso" = total de piezas cotizadas (suma de cantidades de la cotización ligada).
    r.cantidadEnProceso = (r.cotizacion?.items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
  });

  return { items, total };
}

async function obtener(id) {
  const reporte = await Reporte.findById(id)
    .populate("cliente", "nombre rfc domicilioFiscal")
    .populate("contacto", "nombre correo telefono")
    .populate("cotizacion", "folio total")
    .populate("creadoPor", "nombre usuario")
    .populate("historial.usuario.id", "nombre usuario");
  if (!reporte) throw new AppError("Reporte no encontrado", 404);

  const asignaciones = await Asignacion.find({ reporte: id })
    .populate("equipo", "idInterno marca modelo serie descripcion categoria")
    .populate("tecnicoAsignado", "nombre usuario")
    .populate("tecnicoEjecutor", "nombre usuario")
    .populate("patrones", "codigo nombre trazabilidad calibracion");

  return { reporte, asignaciones };
}

async function crear(datos, reqUser) {
  const { cliente } = datos;
  if (!mongoose.isValidObjectId(cliente)) throw new AppError("Cliente inválido", 400);
  if (!(await Cliente.exists({ _id: cliente }))) throw new AppError("Cliente no encontrado", 404);

  const folio = await siguienteFolio("REP");
  const evento = await crearEvento(reqUser, "reporte_creado", { folio });

  return Reporte.create({
    folio,
    cliente,
    contacto: datos.contacto || undefined,
    cotizacion: datos.cotizacion || undefined,
    ordenCompra: datos.ordenCompra,
    factura: datos.factura,
    observaciones: datos.observaciones,
    fechaCompromiso: datos.fechaCompromiso,
    creadoPor: reqUser?.id,
    historial: [evento],
  });
}

async function actualizar(id, datos, reqUser) {
  const reporte = await Reporte.findById(id);
  if (!reporte) throw new AppError("Reporte no encontrado", 404);

  const camposEditables = [
    "contacto", "cotizacion", "ordenCompra", "factura",
    "observaciones", "fechaCompromiso", "fechaEntrega",
  ];
  const cambios = {};
  for (const c of camposEditables) if (datos[c] !== undefined) cambios[c] = datos[c];

  if (datos.status && datos.status !== reporte.status) {
    if (!Reporte.STATUS.includes(datos.status)) throw new AppError("Status inválido", 400);
    // Finalizar/reabrir/cancelar es una decisión de supervisión (Calidad/Admin),
    // no de quien solo captura datos comerciales (ventas).
    if (!["admin", "coordinador"].includes(reqUser?.rol)) {
      throw new AppError("Solo Admin o Coordinador pueden cambiar el estatus del reporte", 403);
    }
    cambios.status = datos.status;
    reporte.historial.push(
      await crearEvento(reqUser, "reporte_status", { de: reporte.status, a: datos.status })
    );
    if (datos.status === "entregado" && !reporte.fechaEntrega) cambios.fechaEntrega = new Date();
  }

  Object.assign(reporte, cambios);
  await reporte.save();
  return reporte;
}

async function paraImprimir(id) {
  const reporte = await Reporte.findById(id)
    .populate("cliente")
    .populate("contacto", "nombre correo telefono")
    .populate("cotizacion", "folio total")
    .populate("creadoPor", "nombre usuario firmaUrl");
  if (!reporte) throw new AppError("Reporte no encontrado", 404);

  const asignaciones = await Asignacion.find({ reporte: id })
    .populate("equipo")
    .populate("tecnicoAsignado", "nombre usuario")
    .populate("tecnicoEjecutor", "nombre usuario firmaUrl")
    .populate("patrones", "codigo nombre trazabilidad")
    .populate("performance", "nombre magnitud tipoInstrumento");

  const laboratorio = await configuracionService.obtenerLaboratorio();
  const logo = await configuracionService.obtenerLogo();
  return { reporte, asignaciones, laboratorio, logo };
}

async function agregarComentario(id, texto, reqUser) {
  if (!texto?.trim()) throw new AppError("El comentario no puede estar vacío", 400);
  const reporte = await Reporte.findById(id);
  if (!reporte) throw new AppError("Reporte no encontrado", 404);
  const evento = await crearEvento(reqUser, "comentario", {});
  reporte.comentarios.push({ texto: texto.trim(), usuario: { id: evento.usuario?.id, nombre: evento.usuario?.nombre } });
  await reporte.save();
  return reporte;
}

async function eliminar(id) {
  const tieneAsignaciones = await Asignacion.exists({ reporte: id });
  if (tieneAsignaciones) {
    throw new AppError("No se puede eliminar: el reporte tiene asignaciones. Cancélalo en su lugar.", 409);
  }
  const reporte = await Reporte.findByIdAndDelete(id);
  if (!reporte) throw new AppError("Reporte no encontrado", 404);
  return reporte;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, paraImprimir, agregarComentario };

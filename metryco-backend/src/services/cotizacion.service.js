const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Cotizacion = require("../models/Cotizacion");
const Cliente = require("../models/Cliente");
const Counter = require("../models/Counter");
const Reporte = require("../models/Reporte");
const AppError = require("../utils/AppError");
const configuracionService = require("./configuracion.service");
const { destinoAdjuntosCotizacion } = require("../middleware/upload");

function redondear(n) {
  return Math.round(n * 100) / 100;
}

function calcularTotales(items, ivaPorcentaje = 16) {
  const subtotal = redondear(
    items.reduce((sum, i) => sum + Number(i.cantidad) * Number(i.precioUnitario), 0)
  );
  const iva = redondear(subtotal * (Number(ivaPorcentaje) / 100));
  const total = redondear(subtotal + iva);
  return { subtotal, iva, total };
}

async function generarFolio() {
  const year = new Date().getFullYear();
  const counterId = `cotizacion-${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `COT-${year}-${String(counter.seq).padStart(3, "0")}`;
}

async function listar({ search = "", status = "todos", mes = "", anio = "", clienteId = "", page = 0, pageSize = 10 }) {
  const match = {};
  if (status && status !== "todos") match.status = status;

  if (mes || anio) {
    const rango = {};
    if (anio) {
      const desde = new Date(Number(anio), mes ? Number(mes) - 1 : 0, 1);
      const hasta = mes ? new Date(Number(anio), Number(mes), 1) : new Date(Number(anio) + 1, 0, 1);
      rango.$gte = desde;
      rango.$lt = hasta;
    }
    if (Object.keys(rango).length) match.fecha = rango;
  }

  if (clienteId && mongoose.isValidObjectId(clienteId)) {
    match.cliente = new mongoose.Types.ObjectId(clienteId);
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: "clientes", localField: "cliente", foreignField: "_id", as: "clienteInfo" } },
    { $unwind: "$clienteInfo" },
    { $lookup: { from: "usuarios", localField: "creadoPor", foreignField: "_id", as: "vendedorInfo" } },
    { $unwind: { path: "$vendedorInfo", preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { folio: { $regex: search, $options: "i" } },
          { "clienteInfo.nombre": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  const [items, totalResult] = await Promise.all([
    Cotizacion.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: page * pageSize },
      { $limit: pageSize },
    ]),
    Cotizacion.aggregate([...pipeline, { $count: "total" }]),
  ]);

  return { items, total: totalResult[0]?.total ?? 0 };
}

async function obtener(id) {
  const cotizacion = await Cotizacion.findById(id)
    .populate("cliente", "nombre rfc contacto domicilioFiscal")
    .populate("razonSocial")
    .populate("contacto")
    .lean();
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);

  // Liga inversa: qué Reporte de Servicio (si alguno) se abrió a partir de esta
  // cotización, para poder saltar de una a otro igual que en el PHP legacy.
  const reporte = await Reporte.findOne({ cotizacion: id }).select("folio status").lean();
  cotizacion.reporte = reporte || null;

  return cotizacion;
}

async function crear(datos, usuarioId) {
  const { cliente, razonSocial, contacto, vigencia, items, observaciones, moneda, ivaPorcentaje } = datos;

  if (!mongoose.isValidObjectId(cliente)) {
    throw new AppError("Cliente inválido", 400);
  }
  const clienteExiste = await Cliente.exists({ _id: cliente });
  if (!clienteExiste) throw new AppError("Cliente no encontrado", 404);

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Agrega al menos una partida", 400);
  }

  const folio = await generarFolio();
  const totales = calcularTotales(items, ivaPorcentaje);

  return Cotizacion.create({
    folio,
    cliente,
    contacto: contacto || undefined,
    razonSocial: razonSocial || undefined,
    vigencia,
    items,
    observaciones,
    moneda: moneda || "MXN",
    ivaPorcentaje: ivaPorcentaje ?? 16,
    creadoPor: usuarioId,
    ...totales,
  });
}

async function actualizar(id, datos) {
  const { cliente, razonSocial, contacto, vigencia, items, observaciones, status, moneda, ivaPorcentaje } = datos;
  const cambios = {};

  if (cliente) {
    if (!mongoose.isValidObjectId(cliente)) throw new AppError("Cliente inválido", 400);
    const clienteExiste = await Cliente.exists({ _id: cliente });
    if (!clienteExiste) throw new AppError("Cliente no encontrado", 404);
    cambios.cliente = cliente;
  }
  if (razonSocial !== undefined) cambios.razonSocial = razonSocial || null;
  if (contacto !== undefined) cambios.contacto = contacto || null;

  if (vigencia) cambios.vigencia = vigencia;
  if (observaciones !== undefined) cambios.observaciones = observaciones;
  if (status) cambios.status = status;
  if (moneda) cambios.moneda = moneda;

  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Agrega al menos una partida", 400);
    }
    cambios.items = items;
    const cotizacionActual = ivaPorcentaje === undefined ? await Cotizacion.findById(id).select("ivaPorcentaje") : null;
    const tasa = ivaPorcentaje ?? cotizacionActual?.ivaPorcentaje ?? 16;
    cambios.ivaPorcentaje = tasa;
    Object.assign(cambios, calcularTotales(items, tasa));
  } else if (ivaPorcentaje !== undefined) {
    const actual = await Cotizacion.findById(id).select("items");
    if (!actual) throw new AppError("Cotización no encontrada", 404);
    cambios.ivaPorcentaje = ivaPorcentaje;
    Object.assign(cambios, calcularTotales(actual.items, ivaPorcentaje));
  }

  const cotizacion = await Cotizacion.findByIdAndUpdate(id, cambios, {
    new: true,
    runValidators: true,
  });
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);
  return cotizacion;
}

async function eliminar(id) {
  const cotizacion = await Cotizacion.findByIdAndDelete(id);
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);
  return cotizacion;
}

/** Datos completos para la vista imprimible (equivalente a cotizacion_pdf.php). */
async function paraImprimir(id) {
  const cotizacion = await Cotizacion.findById(id)
    .populate("cliente")
    .populate("razonSocial")
    .populate("contacto")
    .populate("creadoPor", "nombre usuario");
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);

  const laboratorioBase = await configuracionService.obtenerLaboratorio();
  // Si la cotización tiene una razón social propia, su membrete manda sobre
  // los datos generales del laboratorio (mismo criterio que el legacy).
  const laboratorio = cotizacion.razonSocial
    ? {
        nombre: cotizacion.razonSocial.nombre,
        rfc: cotizacion.razonSocial.rfc,
        domicilio: cotizacion.razonSocial.domicilio,
        telefono: cotizacion.razonSocial.telefono,
        acreditacion: cotizacion.razonSocial.acreditacion,
      }
    : laboratorioBase;
  const logo = await configuracionService.obtenerLogo();
  return { cotizacion, laboratorio, logo };
}

async function subirAdjunto(id, file, usuarioId) {
  if (!file) throw new AppError("No se recibió el archivo", 400);
  const cotizacion = await Cotizacion.findById(id);
  if (!cotizacion) {
    fs.unlink(file.path, () => {});
    throw new AppError("Cotización no encontrada", 404);
  }
  cotizacion.adjuntos.push({
    nombreArchivo: file.filename,
    nombreOriginal: file.originalname,
    mimetype: file.mimetype,
    tamano: file.size,
    subidoPor: usuarioId,
    fecha: new Date(),
  });
  await cotizacion.save();
  return cotizacion;
}

async function archivoAdjuntoStream(id, adjuntoId) {
  const cotizacion = await Cotizacion.findById(id).select("adjuntos");
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);
  const adjunto = cotizacion.adjuntos.id(adjuntoId);
  if (!adjunto) throw new AppError("Adjunto no encontrado", 404);
  const ruta = path.join(destinoAdjuntosCotizacion, adjunto.nombreArchivo);
  if (!fs.existsSync(ruta)) throw new AppError("El archivo ya no existe en el servidor", 404);
  return { ruta, nombre: adjunto.nombreOriginal };
}

async function eliminarAdjunto(id, adjuntoId) {
  const cotizacion = await Cotizacion.findById(id);
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);
  const adjunto = cotizacion.adjuntos.id(adjuntoId);
  if (!adjunto) throw new AppError("Adjunto no encontrado", 404);
  const ruta = path.join(destinoAdjuntosCotizacion, adjunto.nombreArchivo);
  if (fs.existsSync(ruta)) fs.unlink(ruta, () => {});
  adjunto.deleteOne();
  await cotizacion.save();
  return cotizacion;
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar, paraImprimir,
  subirAdjunto, archivoAdjuntoStream, eliminarAdjunto,
};

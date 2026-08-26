const mongoose = require("mongoose");
const Cotizacion = require("../models/Cotizacion");
const Cliente = require("../models/Cliente");
const Counter = require("../models/Counter");
const AppError = require("../utils/AppError");

const IVA_RATE = 0.16;

function redondear(n) {
  return Math.round(n * 100) / 100;
}

function calcularTotales(items) {
  const subtotal = redondear(
    items.reduce((sum, i) => sum + Number(i.cantidad) * Number(i.precioUnitario), 0)
  );
  const iva = redondear(subtotal * IVA_RATE);
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
  const cotizacion = await Cotizacion.findById(id).populate("cliente", "nombre rfc");
  if (!cotizacion) throw new AppError("Cotización no encontrada", 404);
  return cotizacion;
}

async function crear(datos, usuarioId) {
  const { cliente, vigencia, items, observaciones } = datos;

  if (!mongoose.isValidObjectId(cliente)) {
    throw new AppError("Cliente inválido", 400);
  }
  const clienteExiste = await Cliente.exists({ _id: cliente });
  if (!clienteExiste) throw new AppError("Cliente no encontrado", 404);

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Agrega al menos una partida", 400);
  }

  const folio = await generarFolio();
  const totales = calcularTotales(items);

  return Cotizacion.create({
    folio,
    cliente,
    vigencia,
    items,
    observaciones,
    creadoPor: usuarioId,
    ...totales,
  });
}

async function actualizar(id, datos) {
  const { cliente, vigencia, items, observaciones, status } = datos;
  const cambios = {};

  if (cliente) {
    if (!mongoose.isValidObjectId(cliente)) throw new AppError("Cliente inválido", 400);
    const clienteExiste = await Cliente.exists({ _id: cliente });
    if (!clienteExiste) throw new AppError("Cliente no encontrado", 404);
    cambios.cliente = cliente;
  }

  if (vigencia) cambios.vigencia = vigencia;
  if (observaciones !== undefined) cambios.observaciones = observaciones;
  if (status) cambios.status = status;

  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Agrega al menos una partida", 400);
    }
    cambios.items = items;
    Object.assign(cambios, calcularTotales(items));
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

module.exports = { listar, obtener, crear, actualizar, eliminar };

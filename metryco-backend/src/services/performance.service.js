const Performance = require("../models/Performance");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");

/**
 * Fórmula EXACTA del legacy (php/input_form.php). Determinística.
 *   tolerancia = nominal·(%RDG/100) + escalaTotal·(%FS/100) + unidades
 */
function calcularPunto(p) {
  const nominal = Number(p.nominal);
  const escala = Number(p.escalaTotal);
  const rdg = Number(p.porcentajeRdg);
  const fs = Number(p.porcentajeFs);
  const unidades = Number(p.unidades);
  const incert = Number(p.incertidumbre);

  if ([nominal, escala, rdg, fs, unidades].some((n) => !Number.isFinite(n))) {
    return { ...p, minimo: null, maximo: null, minimoReal: null, maximoReal: null };
  }

  const tolerancia = nominal * (rdg / 100) + escala * (fs / 100) + unidades;
  const minimo = nominal - tolerancia;
  const maximo = nominal + tolerancia;
  const tieneIncert = Number.isFinite(incert);

  return {
    ...p,
    minimo: round(minimo),
    maximo: round(maximo),
    minimoReal: tieneIncert ? round(minimo + incert) : null,
    maximoReal: tieneIncert ? round(maximo - incert) : null,
  };
}

const round = (x) => Math.round(x * 1e6) / 1e6;

function normalizarPuntos(puntos = []) {
  return puntos.map(calcularPunto);
}

async function listar({ search = "", magnitud = "", page = 0, pageSize = 10 }) {
  const match = {};
  if (magnitud) match.magnitud = magnitud;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ nombre: rx }, { comentarios: rx }, { tipoInstrumento: rx }];
  }
  const [items, total] = await Promise.all([
    Performance.find(match).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize),
    Performance.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const perf = await Performance.findById(id);
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

async function crear(datos, usuarioId) {
  if (!datos.nombre) throw new AppError("El nombre es obligatorio", 400);
  return Performance.create({
    ...datos,
    puntos: normalizarPuntos(datos.puntos),
    creadoPor: usuarioId,
  });
}

async function actualizar(id, datos) {
  const cambios = { ...datos };
  if (datos.puntos) cambios.puntos = normalizarPuntos(datos.puntos);
  const perf = await Performance.findByIdAndUpdate(id, cambios, { new: true, runValidators: true });
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

async function eliminar(id) {
  const perf = await Performance.findByIdAndDelete(id);
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, calcularPunto, normalizarPuntos };

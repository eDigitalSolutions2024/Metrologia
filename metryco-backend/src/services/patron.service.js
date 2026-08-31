const fs = require("fs");
const path = require("path");
const Patron = require("../models/Patron");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const { uploadsDir } = require("../config/env");

async function listar({ search = "", categoria = "", soloVigentes = "", page = 0, pageSize = 50 }) {
  const match = {};
  if (categoria) match.categoria = categoria;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ codigo: rx }, { nombre: rx }, { marca: rx }, { modelo: rx }, { serie: rx }];
  }
  if (soloVigentes === "true" || soloVigentes === true) {
    match["ultimaCalibracion.vencimiento"] = { $gt: new Date() };
  }

  const [items, total] = await Promise.all([
    Patron.find(match).sort({ codigo: 1 }).skip(page * pageSize).limit(pageSize),
    Patron.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const patron = await Patron.findById(id);
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return patron;
}

async function crear(datos, usuarioId) {
  if (!datos.codigo) throw new AppError("El código del patrón es obligatorio", 400);
  return Patron.create({ ...datos, registradoPor: usuarioId });
}

async function actualizar(id, datos) {
  const patron = await Patron.findByIdAndUpdate(id, datos, { new: true, runValidators: true });
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return patron;
}

async function eliminar(id) {
  const patron = await Patron.findByIdAndDelete(id);
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return patron;
}

function rutaArchivo(patron) {
  if (!patron?.ultimaCalibracion?.archivoUrl) return null;
  return path.join(uploadsDir, "certificados", patron.ultimaCalibracion.archivoUrl);
}

// Certificado PDF del propio patrón (reutiliza la carpeta uploads/certificados
// y el middleware pdfCertificado que ya existía para Certificados de cliente).
async function adjuntarCertificado(id, file) {
  if (!file) throw new AppError("No se recibió el archivo", 400);
  const patron = await Patron.findById(id);
  if (!patron) {
    fs.unlink(file.path, () => {});
    throw new AppError("Patrón no encontrado", 404);
  }

  const anterior = rutaArchivo(patron);
  if (anterior && fs.existsSync(anterior)) fs.unlink(anterior, () => {});

  patron.ultimaCalibracion = { ...(patron.ultimaCalibracion?.toObject?.() ?? patron.ultimaCalibracion ?? {}), archivoUrl: file.filename };
  await patron.save();
  return patron;
}

async function archivoStream(id) {
  const patron = await Patron.findById(id);
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  const ruta = rutaArchivo(patron);
  if (!ruta || !fs.existsSync(ruta)) throw new AppError("El patrón no tiene certificado adjunto", 404);
  return { ruta, nombre: `${patron.codigo}.pdf` };
}

/** Patrones cuyo vencimiento cae dentro de `dias` (default 30). */
async function porVencer(dias = 30) {
  const limite = new Date(Date.now() + dias * 86400000);
  return Patron.find({
    activo: true,
    "ultimaCalibracion.vencimiento": { $gte: new Date(), $lte: limite },
  }).sort({ "ultimaCalibracion.vencimiento": 1 });
}

module.exports = { listar, obtener, crear, actualizar, eliminar, porVencer, adjuntarCertificado, archivoStream };

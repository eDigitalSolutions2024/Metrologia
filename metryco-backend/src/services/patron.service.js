const fs = require("fs");
const path = require("path");
const Patron = require("../models/Patron");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const { crearEvento } = require("../utils/historial");
const { uploadsDir, publicWebUrl } = require("../config/env");
const qr = require("../utils/qr");

function urlInterna(id) {
  return `${publicWebUrl.replace(/\/$/, "")}/equipos/patrones/${id}/editar`;
}

/** vencimiento = fecha de calibración + periodicidad (meses), si no viene explícito. */
function calcularVencimiento(cal) {
  if (!cal) return undefined;
  if (cal.vencimiento) return new Date(cal.vencimiento);
  if (cal.fecha && cal.periodicidadMeses) {
    const d = new Date(cal.fecha);
    d.setMonth(d.getMonth() + Number(cal.periodicidadMeses));
    return d;
  }
  return undefined;
}

function normalizarCalibracion(cal = {}) {
  const out = { ...cal };
  out.vencimiento = calcularVencimiento(cal);
  return out;
}

function conVigencia(doc) {
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  o.vigencia = doc.estadoVigencia ? doc.estadoVigencia() : o.vigencia;
  return o;
}

async function listar({ search = "", categoria = "", vigencia = "", estado = "", page = 0, pageSize = 50 }) {
  const match = {};
  if (categoria) match.categoria = categoria;
  if (estado) match.estado = estado;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ codigo: rx }, { nombre: rx }, { marca: rx }, { modelo: rx }, { serie: rx }, { "calibracion.numeroCertificado": rx }];
  }
  const ahora = new Date();
  if (vigencia === "vigente") match["calibracion.vencimiento"] = { $gt: new Date(ahora.getTime() + 30 * 86400000) };
  if (vigencia === "por_vencer") match["calibracion.vencimiento"] = { $gt: ahora, $lte: new Date(ahora.getTime() + 30 * 86400000) };
  if (vigencia === "vencido") match["calibracion.vencimiento"] = { $lte: ahora };

  const [items, total] = await Promise.all([
    Patron.find(match).sort({ codigo: 1 }).skip(page * pageSize).limit(pageSize),
    Patron.countDocuments(match),
  ]);
  return { items: items.map(conVigencia), total };
}

async function obtener(id) {
  const patron = await Patron.findById(id).populate("historial.usuario.id", "nombre usuario");
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return conVigencia(patron);
}

async function crear(datos, reqUser) {
  if (!datos.codigo) throw new AppError("El código del patrón es obligatorio", 400);
  if (!datos.nombre) throw new AppError("El nombre del patrón es obligatorio", 400);

  const ev = await crearEvento(reqUser, "patron_creado", { codigo: datos.codigo });
  const patron = await Patron.create({
    ...datos,
    codigo: String(datos.codigo).toUpperCase(),
    calibracion: normalizarCalibracion(datos.calibracion),
    registradoPor: reqUser?.id,
    historial: [ev],
  });
  return conVigencia(patron);
}

async function actualizar(id, datos, reqUser) {
  const patron = await Patron.findById(id);
  if (!patron) throw new AppError("Patrón no encontrado", 404);

  const editables = [
    "nombre", "descripcion", "categoria", "magnitud", "marca", "modelo", "serie",
    "unidad", "intervaloMedicion", "resolucion", "incertidumbre", "deriva",
    "trazabilidad", "condicionesReferencia", "manejo", "procedimiento",
    "transporte", "almacenamiento", "estado",
  ];
  for (const c of editables) if (datos[c] !== undefined) patron[c] = datos[c];

  if (datos.calibracion !== undefined) {
    const antesVenc = patron.calibracion?.vencimiento;
    patron.calibracion = {
      ...patron.calibracion?.toObject?.(),
      ...normalizarCalibracion({ ...patron.calibracion?.toObject?.(), ...datos.calibracion }),
    };
    if (String(antesVenc) !== String(patron.calibracion?.vencimiento)) {
      patron.historial.push(
        await crearEvento(reqUser, "recalibracion", {
          certificado: patron.calibracion?.numeroCertificado,
          vence: patron.calibracion?.vencimiento,
        })
      );
    }
  }

  patron.historial.push(await crearEvento(reqUser, "patron_editado", {}));
  await patron.save();
  return conVigencia(patron);
}

async function eliminar(id) {
  // Baja lógica: los certificados históricos siguen refiriéndolo.
  const patron = await Patron.findByIdAndUpdate(id, { estado: "baja" }, { new: true });
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return conVigencia(patron);
}

async function adjuntarPdf(id, file, reqUser) {
  if (!file) throw new AppError("No se recibió el archivo", 400);
  const patron = await Patron.findById(id);
  if (!patron) {
    fs.unlink(file.path, () => {});
    throw new AppError("Patrón no encontrado", 404);
  }
  patron.calibracion = patron.calibracion || {};
  patron.calibracion.archivo = {
    nombreArchivo: file.filename,
    nombreOriginal: file.originalname,
    mimetype: file.mimetype,
    tamano: file.size,
    subidoPor: reqUser?.id,
    fecha: new Date(),
  };
  patron.historial.push(await crearEvento(reqUser, "certificado_patron_adjuntado", { nombre: file.originalname }));
  await patron.save();
  return conVigencia(patron);
}

function rutaArchivo(patron) {
  const nombre = patron?.calibracion?.archivo?.nombreArchivo;
  if (!nombre) return null;
  return path.join(uploadsDir, "patrones", nombre);
}

// Alias histórico: el certificado del patrón se adjunta con `adjuntarPdf`
// (modelo estructurado `calibracion.archivo`). Se mantiene el nombre para
// las rutas que aún lo referencian.
const adjuntarCertificado = adjuntarPdf;

async function archivoStream(id) {
  const patron = await Patron.findById(id);
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  const ruta = rutaArchivo(patron);
  if (!ruta || !fs.existsSync(ruta)) throw new AppError("El patrón no tiene certificado adjunto", 404);
  const nombreOriginal = patron.calibracion?.archivo?.nombreOriginal;
  return { ruta, nombre: nombreOriginal || `${patron.codigo}.pdf` };
}

/** Patrones cuyo vencimiento cae dentro de `dias` (default 30). */
async function porVencer(dias = 30) {
  const limite = new Date(Date.now() + dias * 86400000);
  const items = await Patron.find({
    estado: "activo",
    "calibracion.vencimiento": { $gte: new Date(), $lte: limite },
  }).sort({ "calibracion.vencimiento": 1 });
  return items.map(conVigencia);
}

async function qrPng(id) {
  const patron = await Patron.findById(id).select("_id");
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return qr.pngBuffer(urlInterna(patron._id));
}

async function qrSvg(id) {
  const patron = await Patron.findById(id).select("_id");
  if (!patron) throw new AppError("Patrón no encontrado", 404);
  return qr.svg(urlInterna(patron._id));
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar, porVencer, calcularVencimiento,
  adjuntarPdf, adjuntarCertificado, archivoStream, qrPng, qrSvg,
};

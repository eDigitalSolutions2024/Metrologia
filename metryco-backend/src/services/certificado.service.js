const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Certificado = require("../models/Certificado");
const Asignacion = require("../models/Asignacion");
const Equipo = require("../models/Equipo");
const Reporte = require("../models/Reporte");
const Patron = require("../models/Patron");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const { siguienteFolio } = require("../utils/folio");
const { crearEvento } = require("../utils/historial");
const qr = require("../utils/qr");
const { publicWebUrl, uploadsDir } = require("../config/env");
const configuracionService = require("./configuracion.service");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

function urlPublica(token) {
  return `${publicWebUrl.replace(/\/$/, "")}/certificado/ver/${token}`;
}

function rutaArchivo(cert) {
  if (!cert?.archivo?.nombreArchivo) return null;
  return path.join(uploadsDir, "certificados", cert.archivo.nombreArchivo);
}

/** Estado guardado sincronizado con el estado derivado por fechas. */
function conEstadoVigente(certDoc) {
  const obj = certDoc.toObject ? certDoc.toObject() : certDoc;
  obj.estadoEfectivo = certDoc.estadoCalculado ? certDoc.estadoCalculado() : obj.estado;
  obj.urlPublica = urlPublica(obj.publicToken);
  return obj;
}

async function listar({ search = "", clienteId = "", estado = "", page = 0, pageSize = 10 }) {
  const match = {};
  if (clienteId && oid(clienteId)) match.cliente = oid(clienteId);
  if (estado) match.estado = estado;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [
      { folio: rx },
      { "equipoSnapshot.idInterno": rx },
      { "equipoSnapshot.serie": rx },
      { "clienteSnapshot.nombre": rx },
    ];
  }

  const [items, total] = await Promise.all([
    Certificado.find(match)
      .populate("cliente", "nombre rfc")
      .populate("creadoPor", "nombre usuario")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Certificado.countDocuments(match),
  ]);

  return { items: items.map(conEstadoVigente), total };
}

/**
 * Exportación (CSV desde el frontend): sin paginación, con filtros de
 * cliente/mes/año (por `fechaEmision`) y con/sin factura (del Reporte
 * ligado, el Certificado en sí no tiene campo de factura propio).
 */
async function exportar({ clienteId = "", mes = "", anio = "", factura = "todos" }) {
  const match = {};
  if (clienteId && oid(clienteId)) match.cliente = oid(clienteId);
  if (anio) {
    const y = Number(anio);
    const m = mes ? Number(mes) : null;
    const desde = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
    const hasta = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
    match.fechaEmision = { $gte: desde, $lt: hasta };
  }

  let items = await Certificado.find(match)
    .populate("cliente", "nombre rfc")
    .populate("reporte", "folio factura")
    .sort({ fechaEmision: -1 })
    .limit(5000);

  items = items.map(conEstadoVigente);

  if (factura === "con") items = items.filter((c) => !!c.reporte?.factura);
  if (factura === "sin") items = items.filter((c) => !c.reporte?.factura);

  return items;
}

async function obtener(id) {
  const cert = await Certificado.findById(id)
    .populate("cliente", "nombre rfc")
    .populate("equipo", "idInterno marca modelo serie")
    .populate("reporte", "folio")
    .populate("asignacion", "folio estados")
    .populate("creadoPor", "nombre usuario firmaUrl")
    .populate("historial.usuario.id", "nombre usuario");
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  return conEstadoVigente(cert);
}

/**
 * Emite un certificado. Dos caminos:
 *   a) { asignacion }  -> toma equipo/patrones/cliente/reporte de la asignación.
 *   b) { equipo, cliente, fechaCalibracion } -> certificado suelto.
 * En ambos se guarda un SNAPSHOT inmutable de equipo/cliente/patrones.
 */
async function emitir(datos, reqUser) {
  const laboratorioActual = await configuracionService.obtenerLaboratorio();
  let equipoDoc;
  let clienteId;
  let reporteId;
  let asignacionId;
  let patronesDocs = [];
  let fechaCalibracion = datos.fechaCalibracion;

  if (datos.asignacion) {
    if (!oid(datos.asignacion)) throw new AppError("Asignación inválida", 400);
    const asig = await Asignacion.findById(datos.asignacion).populate("equipo").populate("patrones");
    if (!asig) throw new AppError("Asignación no encontrada", 404);
    if (await Certificado.exists({ asignacion: asig._id })) {
      throw new AppError("Esa asignación ya tiene un certificado", 409);
    }
    equipoDoc = asig.equipo;
    patronesDocs = asig.patrones || [];
    asignacionId = asig._id;
    reporteId = asig.reporte;
    const rep = await Reporte.findById(asig.reporte).select("cliente");
    clienteId = rep?.cliente;
    fechaCalibracion = fechaCalibracion || asig.fechaCalibracion;
  } else {
    if (!oid(datos.equipo)) throw new AppError("Falta el equipo (o una asignación)", 400);
    equipoDoc = await Equipo.findById(datos.equipo);
    if (!equipoDoc) throw new AppError("Equipo no encontrado", 404);
    clienteId = datos.cliente || equipoDoc.cliente;
    if (Array.isArray(datos.patrones) && datos.patrones.length) {
      patronesDocs = await Patron.find({ _id: { $in: datos.patrones.filter(oid) } });
    }
  }

  if (!clienteId) throw new AppError("No se pudo determinar el cliente", 400);
  if (!fechaCalibracion) throw new AppError("La fecha de calibración es obligatoria", 400);

  const Cliente = require("../models/Cliente");
  const clienteDoc = await Cliente.findById(clienteId).select("nombre");

  // Puntos: toma los CalculoIncertidumbre APROBADOS de la asignación.
  let puntos = [];
  if (asignacionId) {
    const CalculoIncertidumbre = require("../models/CalculoIncertidumbre");
    const calcs = await CalculoIncertidumbre.find({
      asignacion: asignacionId,
      estado: "aprobado",
    }).sort({ puntoNominal: 1 });
    puntos = calcs.map((c) => ({
      calculo: c._id,
      folioCalculo: c.folio,
      mensurando: c.mensurando,
      condicion: c.condicion || "unico",
      puntoNominal: c.puntoNominal,
      lecturas: c.lecturas || [],
      valorMedido: c.resultado?.y ?? c.valorMedido,
      desviacionStd: c.desviacionStd ?? 0,
      errorIndicacion: c.errorIndicacion,
      emp: c.emp,
      criterio: c.criterio || "sin_evaluar",
      unidad: c.unidad,
      uCombinada: c.resultado?.uCombinada,
      incertidumbreExpandida: c.resultado?.incertidumbreExpandida,
      k: c.resultado?.k,
      nivelConfianza: c.resultado?.nivelConfianza,
    }));
  }
  const resultadoResumen =
    datos.resultado ||
    (puntos.length
      ? {
          valorMedido: puntos[0].valorMedido,
          unidad: puntos[0].unidad,
          incertidumbreExpandida: puntos[0].incertidumbreExpandida,
          k: puntos[0].k,
          nivelConfianza: puntos[0].nivelConfianza,
        }
      : undefined);

  const folio = await siguienteFolio("CERT");
  const evento = await crearEvento(reqUser, "certificado_emitido", { folio });

  const cert = await Certificado.create({
    folio,
    asignacion: asignacionId,
    reporte: reporteId,
    cliente: clienteId,
    equipo: equipoDoc?._id,
    equipoSnapshot: {
      idInterno: equipoDoc?.idInterno,
      marca: equipoDoc?.marca,
      modelo: equipoDoc?.modelo,
      serie: equipoDoc?.serie,
      descripcion: equipoDoc?.descripcion,
      categoria: equipoDoc?.categoria,
      subtipo: equipoDoc?.subtipo,
      accuracy: equipoDoc?.accuracy,
      unidades: equipoDoc?.unidades,
      divisionMinima: equipoDoc?.divisionMinima,
      rango: equipoDoc?.rangoCalibracion || equipoDoc?.rango,
    },
    clienteSnapshot: { nombre: clienteDoc?.nombre },
    patronesSnapshot: patronesDocs.map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      trazabilidad: p.trazabilidad,
      incertidumbre: p.incertidumbre?.valor
        ? `${p.incertidumbre.valor} ${p.incertidumbre.unidad || ""} (k=${p.incertidumbre.k || 2})`
        : undefined,
    })),
    laboratorio: { nombre: laboratorioActual.nombre, acreditacion: laboratorioActual.acreditacion },
    fechaCalibracion,
    fechaEmision: datos.fechaEmision || new Date(),
    vigencia: datos.vigencia || undefined,
    estado: "borrador",
    resultado: resultadoResumen,
    puntos,
    creadoPor: reqUser?.id,
    historial: [evento],
  });

  if (asignacionId) {
    await Asignacion.updateOne(
      { _id: asignacionId },
      { $set: { "estados.certificado": "en_revision" } }
    );
  }

  return conEstadoVigente(cert);
}

async function actualizar(id, datos, reqUser) {
  const cert = await Certificado.findById(id);
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  if (cert.estado === "anulado") throw new AppError("El certificado está anulado", 409);

  for (const campo of ["fechaCalibracion", "fechaEmision", "vigencia", "resultado"]) {
    if (datos[campo] !== undefined) cert[campo] = datos[campo];
  }
  cert.historial.push(await crearEvento(reqUser, "certificado_editado", {}));
  await cert.save();
  return conEstadoVigente(cert);
}

async function cambiarEstado(id, estado, reqUser) {
  const cert = await Certificado.findById(id);
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  if (cert.estado === "anulado") throw new AppError("El certificado está anulado", 409);
  // El vencimiento (por_vencer / vencido) es automático por fechas; a mano sólo
  // se pasa de borrador a vigente (o de vuelta a borrador para corregir).
  if (!["borrador", "vigente"].includes(estado)) {
    throw new AppError("Estado no permitido manualmente (borrador o vigente)", 400);
  }
  const anterior = cert.estado;
  cert.estado = estado;
  cert.historial.push(
    await crearEvento(reqUser, `certificado_estado: ${anterior} → ${estado}`, {})
  );
  await cert.save();

  if (cert.asignacion && estado === "vigente") {
    await Asignacion.updateOne(
      { _id: cert.asignacion },
      { $set: { "estados.certificado": "autorizado" } }
    );
  }
  return conEstadoVigente(cert);
}

async function adjuntarPdf(id, file, reqUser) {
  if (!file) throw new AppError("No se recibió el archivo", 400);
  const cert = await Certificado.findById(id);
  if (!cert) {
    fs.unlink(file.path, () => {});
    throw new AppError("Certificado no encontrado", 404);
  }

  // Borra el PDF anterior si existía.
  const anterior = rutaArchivo(cert);
  if (anterior && fs.existsSync(anterior)) fs.unlink(anterior, () => {});

  cert.archivo = {
    nombreArchivo: file.filename,
    nombreOriginal: file.originalname,
    mimetype: file.mimetype,
    tamano: file.size,
    subidoPor: reqUser?.id,
    fecha: new Date(),
  };
  cert.historial.push(
    await crearEvento(reqUser, "pdf_adjuntado", { nombre: file.originalname, tamano: file.size })
  );
  await cert.save();
  return conEstadoVigente(cert);
}

async function anular(id, motivo, reqUser) {
  if (!motivo || !motivo.trim()) throw new AppError("El motivo de anulación es obligatorio", 400);
  const cert = await Certificado.findById(id);
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  if (cert.estado === "anulado") throw new AppError("El certificado ya está anulado", 409);

  const ev = await crearEvento(reqUser, "certificado_anulado", { motivo });
  cert.estado = "anulado";
  cert.anulacion = {
    motivo: motivo.trim(),
    usuario: { id: reqUser?.id, nombre: ev.usuario?.nombre },
    fecha: new Date(),
  };
  cert.historial.push(ev);
  await cert.save();
  return conEstadoVigente(cert);
}

/** Rota el token público (p. ej. si se filtró). El QR anterior deja de servir. */
async function regenerarToken(id, reqUser) {
  const cert = await Certificado.findById(id);
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  cert.publicToken = crypto.randomBytes(16).toString("hex");
  cert.historial.push(await crearEvento(reqUser, "token_regenerado", {}));
  await cert.save();
  return conEstadoVigente(cert);
}

async function qrPng(id) {
  const cert = await Certificado.findById(id).select("publicToken folio");
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  return qr.pngBuffer(urlPublica(cert.publicToken));
}

async function qrSvg(id) {
  const cert = await Certificado.findById(id).select("publicToken");
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  return qr.svg(urlPublica(cert.publicToken));
}

/** Certificados vigentes cuya fecha de vigencia cae dentro de `dias` (default 30). */
async function porVencer(dias = 30) {
  const limite = new Date(Date.now() + dias * 86400000);
  return Certificado.find({
    estado: { $nin: ["anulado", "borrador"] },
    vigencia: { $gte: new Date(), $lte: limite },
  })
    .populate("cliente", "nombre")
    .sort({ vigencia: 1 });
}

async function archivoStream(id) {
  const cert = await Certificado.findById(id);
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  const ruta = rutaArchivo(cert);
  if (!ruta || !fs.existsSync(ruta)) throw new AppError("El certificado no tiene PDF adjunto", 404);
  return { ruta, nombre: `${cert.folio}.pdf` };
}

module.exports = {
  listar, obtener, exportar, emitir, actualizar, cambiarEstado, adjuntarPdf,
  anular, regenerarToken, qrPng, qrSvg, archivoStream, porVencer,
  urlPublica, rutaArchivo,
};

const mongoose = require("mongoose");
const CalculoIncertidumbre = require("../models/CalculoIncertidumbre");
const ModeloIncertidumbre = require("../models/ModeloIncertidumbre");
const Patron = require("../models/Patron");
const Asignacion = require("../models/Asignacion");
const AppError = require("../utils/AppError");
const { siguienteFolio } = require("../utils/folio");
const { crearEvento } = require("../utils/historial");
const engine = require("./incertidumbre/engine");

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

function desviacionEstandarMuestral(xs = []) {
  const n = xs.length;
  if (n < 2) return null;
  const media = xs.reduce((a, b) => a + b, 0) / n;
  const s2 = xs.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1);
  return { media, s: Math.sqrt(s2), n };
}

/** Convierte la plantilla de un modelo en contribuciones editables. */
function contribucionesDesdeModelo(modelo) {
  return (modelo.contribuciones || []).map((c) => ({
    fuente: c.fuente,
    simbolo: c.simbolo,
    origen: "plantilla",
    tipo: c.tipo,
    modo: c.modo,
    distribucion: c.distribucion,
    valor: c.valorSugerido ?? 0,
    k: c.k ?? 2,
    n: c.n,
    divisorManual: c.divisorManual,
    coefSensibilidad: c.coefSensibilidad ?? 1,
    gradosLibertad: c.gradosLibertad,
    unidad: c.unidad || modelo.unidad,
    notas: c.ayuda,
  }));
}

const esPlaceholderPatron = (c) =>
  (c.modo === "certificado" || /certificad/i.test(c.modo || "")) &&
  // tolerante a codificación: patrón / patron / patr�n
  /patr.?n de referencia|bloques patr|reference standard/i.test(c.fuente || "") &&
  (c.origen === "plantilla" || c.origen == null);

/**
 * Sustituye la contribución genérica "Incertidumbre del patrón de referencia" de
 * la plantilla por una contribución REAL por cada patrón usado, tomada de su
 * certificado (`Patron.uEn(nominal)`), más su deriva si está registrada.
 * Devuelve además avisos si algún patrón está fuera de vigencia.
 */
function aplicarPatrones(contribuciones, patronesDocs = [], puntoNominal, unidad, refFecha = new Date()) {
  const advertencias = [];
  if (!patronesDocs.length) return { contribuciones, advertencias };

  // quita el placeholder genérico de la plantilla y cualquier fila de patrón previa
  // (así re-inyectar es idempotente al recalcular / cambiar el punto nominal)
  let out = contribuciones.filter((c) => !esPlaceholderPatron(c) && c.origen !== "patron");

  for (const p of patronesDocs) {
    const { U, k, unidad: uUnidad } = p.uEn(puntoNominal);
    if (Number.isFinite(U)) {
      out.push({
        fuente: `Patrón ${p.codigo}`,
        simbolo: "U_patrón",
        origen: "patron",
        tipo: "B",
        modo: "certificado",
        distribucion: "normal",
        valor: U,
        k: k || 2,
        coefSensibilidad: 1,
        unidad: uUnidad || unidad,
        notas: `Certificado ${p.calibracion?.numeroCertificado || "s/n"} (${p.calibracion?.laboratorio || p.trazabilidad || "—"}); u = U/k`,
      });
    }
    if (p.deriva?.valor) {
      out.push({
        fuente: `Deriva de ${p.codigo}`,
        simbolo: "δ_der",
        origen: "patron",
        tipo: "B",
        modo: "semiamplitud",
        distribucion: "rectangular",
        valor: Math.abs(p.deriva.valor),
        coefSensibilidad: 1,
        unidad: p.deriva.unidad || unidad,
        notas: `Deriva máx. registrada ${p.deriva.valor} por ${p.deriva.periodoMeses || "?"} meses`,
      });
    }
    const estadoV = p.estadoVigencia(refFecha);
    if (estadoV === "vencido") {
      advertencias.push(`El patrón ${p.codigo} estaba VENCIDO en la fecha de calibración.`);
    } else if (estadoV === "por_vencer") {
      advertencias.push(`El patrón ${p.codigo} vence pronto (${p.calibracion?.vencimiento?.toISOString?.().slice(0, 10)}).`);
    }
    if (p.estado !== "activo") {
      advertencias.push(`El patrón ${p.codigo} no está activo (estado: ${p.estado}).`);
    }
  }
  return { contribuciones: out, advertencias };
}

/** Carga los docs de patrón desde ids sueltos o desde la asignación. */
async function resolverPatrones({ patronesUsados, asignacion }) {
  let ids = (patronesUsados || []).map(oid).filter(Boolean);
  if (!ids.length && oid(asignacion)) {
    const a = await Asignacion.findById(asignacion).select("patrones");
    ids = (a?.patrones || []).map((x) => x);
  }
  if (!ids.length) return [];
  return Patron.find({ _id: { $in: ids } });
}

/**
 * Inserta / actualiza una contribución de Repetibilidad tipo A a partir de las
 * lecturas repetidas capturadas por el técnico. Determinístico: u = s/√n.
 */
function aplicarRepetibilidad(contribuciones, lecturas, unidad) {
  const stats = desviacionEstandarMuestral((lecturas || []).map(Number).filter(Number.isFinite));
  if (!stats) return contribuciones;
  const nueva = {
    fuente: "Repetibilidad (tipo A)",
    simbolo: "s(q̄)",
    origen: "repetibilidad",
    tipo: "A",
    modo: "desviacion_std",
    distribucion: "normal",
    valor: stats.s,
    n: stats.n,
    coefSensibilidad: 1,
    unidad,
    notas: `Derivada de ${stats.n} lecturas; media = ${stats.media}`,
  };
  const idx = contribuciones.findIndex((c) => /repetibil/i.test(c.fuente || ""));
  if (idx >= 0) contribuciones[idx] = nueva;
  else contribuciones.unshift(nueva);
  return contribuciones;
}

/** Corre el motor determinístico y arma el bloque {contribuciones, resultado, motor}. */
function ejecutarMotor({ contribuciones, valorMedido, nivelConfianza }) {
  return engine.calcular({ contribuciones, y: valorMedido, nivelConfianza });
}

/**
 * Campos para el informe de calibración: desviación estándar de las lecturas,
 * error de indicación (y − nominal) y criterio PASA/NO PASA contra el EMP.
 */
function camposInforme({ datos, modeloDoc, y }) {
  const lecturas = (datos.lecturas || []).map(Number).filter(Number.isFinite);
  const desviacionStd = lecturas.length >= 2 ? desviacionEstandarMuestral(lecturas).s : 0;

  const emp =
    datos.emp != null && Number.isFinite(Number(datos.emp))
      ? Number(datos.emp)
      : modeloDoc?.criterioAceptacion?.emp;

  const nominal = Number(datos.puntoNominal);
  const errorIndicacion =
    Number.isFinite(nominal) && Number.isFinite(y) ? y - nominal : undefined;

  let criterio = "sin_evaluar";
  if (emp != null && Number.isFinite(errorIndicacion)) {
    criterio = Math.abs(errorIndicacion) <= Math.abs(emp) ? "pasa" : "no_pasa";
  }

  return {
    condicion: ["encontrado", "dejado", "unico"].includes(datos.condicion) ? datos.condicion : "unico",
    emp,
    desviacionStd,
    errorIndicacion,
    criterio,
  };
}

/** Cálculo sin persistir — para la vista previa "en vivo" del formulario. */
async function preview(datos) {
  let contribuciones = [...(datos.contribuciones || [])];
  let advertencias = [];

  // Inyecta las contribuciones reales de los patrones usados (si se indicaron).
  if (datos.patronesUsados?.length || datos.asignacion) {
    const patronesDocs = await resolverPatrones(datos);
    const r = aplicarPatrones(
      contribuciones, patronesDocs, datos.puntoNominal, datos.unidad,
      datos.fechaCalibracion ? new Date(datos.fechaCalibracion) : new Date()
    );
    contribuciones = r.contribuciones;
    advertencias = r.advertencias;
  }

  if (Array.isArray(datos.lecturas) && datos.lecturas.length >= 2) {
    aplicarRepetibilidad(contribuciones, datos.lecturas, datos.unidad);
  }
  const y =
    datos.valorMedido ??
    (Array.isArray(datos.lecturas) && datos.lecturas.length
      ? desviacionEstandarMuestral(datos.lecturas.map(Number))?.media
      : undefined);

  const salida = ejecutarMotor({ contribuciones, valorMedido: y, nivelConfianza: datos.nivelConfianza });
  return { ...salida, advertencias };
}

async function listar({ equipo = "", asignacion = "", estado = "", magnitud = "", page = 0, pageSize = 20 }) {
  const match = {};
  if (oid(equipo)) match.equipo = oid(equipo);
  if (oid(asignacion)) match.asignacion = oid(asignacion);
  if (estado) match.estado = estado;
  if (magnitud) match.magnitud = String(magnitud).toLowerCase();

  const [items, total] = await Promise.all([
    CalculoIncertidumbre.find(match)
      .populate("creadoPor", "nombre usuario")
      .populate("equipo", "idInterno marca modelo")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    CalculoIncertidumbre.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const c = await CalculoIncertidumbre.findById(id)
    .populate("creadoPor", "nombre usuario")
    .populate("modelo", "nombre magnitud tipoInstrumento normaReferencia")
    .populate("equipo", "idInterno marca modelo serie")
    .populate("patronesUsados", "codigo nombre trazabilidad")
    .populate("historial.usuario.id", "nombre usuario");
  if (!c) throw new AppError("Cálculo de incertidumbre no encontrado", 404);
  return c;
}

async function crear(datos, reqUser) {
  let modeloDoc = null;
  let contribuciones = datos.contribuciones ? [...datos.contribuciones] : [];

  if (datos.modelo) {
    if (!oid(datos.modelo)) throw new AppError("Modelo inválido", 400);
    modeloDoc = await ModeloIncertidumbre.findById(datos.modelo);
    if (!modeloDoc) throw new AppError("Modelo de incertidumbre no encontrado", 404);
    if (!contribuciones.length) contribuciones = contribucionesDesdeModelo(modeloDoc);
  }
  if (!contribuciones.length) {
    throw new AppError("Se requiere un modelo o al menos una contribución", 400);
  }

  const unidad = datos.unidad || modeloDoc?.unidad;

  // Contribuciones reales de los patrones usados (reemplazan el placeholder).
  let advertencias = [];
  const patronesDocs = await resolverPatrones(datos);
  if (patronesDocs.length) {
    const r = aplicarPatrones(
      contribuciones, patronesDocs, datos.puntoNominal, unidad,
      datos.fechaCalibracion ? new Date(datos.fechaCalibracion) : new Date()
    );
    contribuciones = r.contribuciones;
    advertencias = r.advertencias;
  }

  if (Array.isArray(datos.lecturas) && datos.lecturas.length >= 2) {
    aplicarRepetibilidad(contribuciones, datos.lecturas, unidad);
  }

  const y =
    datos.valorMedido ??
    (Array.isArray(datos.lecturas) && datos.lecturas.length
      ? desviacionEstandarMuestral(datos.lecturas.map(Number))?.media
      : undefined);

  const nivel = datos.nivelConfianza || modeloDoc?.nivelConfianza || "95.45%";
  const salida = ejecutarMotor({ contribuciones, valorMedido: y, nivelConfianza: nivel });
  const informe = camposInforme({ datos, modeloDoc, y });

  const folio = await siguienteFolio("UNC");
  const evento = await crearEvento(reqUser, "calculo_creado", {
    folio,
    motor: salida.motor,
    U: salida.resultado.incertidumbreExpandida,
  });

  const doc = await CalculoIncertidumbre.create({
    folio,
    modelo: modeloDoc?._id,
    modeloSnapshot: modeloDoc
      ? {
          nombre: modeloDoc.nombre,
          normaReferencia: modeloDoc.normaReferencia,
          nivelConfianza: modeloDoc.nivelConfianza,
        }
      : undefined,
    magnitud: (datos.magnitud || modeloDoc?.magnitud || "").toLowerCase() || undefined,
    tipoInstrumento:
      (datos.tipoInstrumento || modeloDoc?.tipoInstrumento || "").toLowerCase() || undefined,
    mensurando: datos.mensurando || modeloDoc?.mensurando,
    unidad,
    equipo: oid(datos.equipo) || undefined,
    asignacion: oid(datos.asignacion) || undefined,
    patronesUsados: (datos.patronesUsados || []).filter(oid),
    puntoNominal: datos.puntoNominal,
    lecturas: Array.isArray(datos.lecturas) ? datos.lecturas.map(Number) : [],
    valorMedido: y,
    ...informe,
    advertencias,
    contribuciones: salida.contribuciones,
    resultado: salida.resultado,
    motor: salida.motor,
    estado: datos.borrador ? "borrador" : "calculado",
    version: 1,
    creadoPor: reqUser?.id,
    historial: [evento],
  });

  // Enlaza el cálculo a su asignación (para que el certificado lo recoja).
  if (doc.asignacion) {
    const Asignacion = require("../models/Asignacion");
    await Asignacion.updateOne(
      { _id: doc.asignacion },
      { $addToSet: { calculosIncertidumbre: doc._id } }
    );
  }

  return doc;
}

/**
 * Recalcula con datos nuevos SIN sobreescribir: archiva la versión actual en
 * `versionesPrevias` y sube el número de versión.
 */
async function recalcular(id, datos, reqUser) {
  const c = await CalculoIncertidumbre.findById(id);
  if (!c) throw new AppError("Cálculo de incertidumbre no encontrado", 404);
  if (c.estado === "aprobado") {
    throw new AppError("El cálculo está aprobado; crea uno nuevo en lugar de modificarlo", 409);
  }

  const ev = await crearEvento(reqUser, `recalculo v${c.version} → v${c.version + 1}`, {});
  c.versionesPrevias.push({
    version: c.version,
    contribuciones: c.contribuciones,
    resultado: c.resultado,
    fecha: new Date(),
    por: { id: reqUser?.id, nombre: ev.usuario?.nombre },
  });

  let contribuciones = datos.contribuciones ? [...datos.contribuciones] : c.contribuciones.map((x) => x.toObject());

  if (datos.condicion) c.condicion = datos.condicion;
  if (datos.emp != null) c.emp = Number(datos.emp);
  if (datos.puntoNominal !== undefined) c.puntoNominal = datos.puntoNominal;

  // Re-inyecta las contribuciones de los patrones usados (re-interpola la U si el
  // patrón tiene tabla y cambió el punto nominal). Idempotente.
  let advertencias = c.advertencias || [];
  if ((c.patronesUsados || []).length || datos.asignacion) {
    const patronesDocs = await resolverPatrones({
      patronesUsados: c.patronesUsados, asignacion: datos.asignacion || c.asignacion,
    });
    if (patronesDocs.length) {
      const r = aplicarPatrones(contribuciones, patronesDocs, c.puntoNominal, c.unidad, new Date());
      contribuciones = r.contribuciones;
      advertencias = r.advertencias;
    }
  }

  if (Array.isArray(datos.lecturas)) {
    c.lecturas = datos.lecturas.map(Number);
    if (c.lecturas.length >= 2) aplicarRepetibilidad(contribuciones, c.lecturas, c.unidad);
  }
  if (datos.valorMedido !== undefined) c.valorMedido = datos.valorMedido;
  if (datos.nivelConfianza) c.modeloSnapshot = { ...c.modeloSnapshot, nivelConfianza: datos.nivelConfianza };
  c.advertencias = advertencias;

  const nivel = datos.nivelConfianza || c.modeloSnapshot?.nivelConfianza || "95.45%";
  const salida = ejecutarMotor({ contribuciones, valorMedido: c.valorMedido, nivelConfianza: nivel });

  const inf = camposInforme({
    datos: { lecturas: c.lecturas, emp: c.emp, puntoNominal: c.puntoNominal, condicion: c.condicion },
    modeloDoc: null,
    y: c.valorMedido,
  });
  c.condicion = inf.condicion;
  c.desviacionStd = inf.desviacionStd;
  c.errorIndicacion = inf.errorIndicacion;
  c.criterio = inf.criterio;

  c.contribuciones = salida.contribuciones;
  c.resultado = salida.resultado;
  c.motor = salida.motor;
  c.version += 1;
  c.estado = "calculado";
  c.revisadoPor = undefined;
  c.aprobadoPor = undefined;
  c.historial.push(ev);
  await c.save();
  return c;
}

async function revisar(id, reqUser) {
  return transicion(id, "revisado", "revisadoPor", ["calculado"], reqUser);
}
async function aprobar(id, reqUser) {
  return transicion(id, "aprobado", "aprobadoPor", ["calculado", "revisado"], reqUser);
}

async function transicion(id, estado, campoFirma, desde, reqUser) {
  const c = await CalculoIncertidumbre.findById(id);
  if (!c) throw new AppError("Cálculo de incertidumbre no encontrado", 404);
  if (!desde.includes(c.estado)) {
    throw new AppError(`No se puede pasar a "${estado}" desde "${c.estado}"`, 409);
  }
  const ev = await crearEvento(reqUser, `estado → ${estado}`, {});
  c.estado = estado;
  c[campoFirma] = { id: reqUser?.id, nombre: ev.usuario?.nombre, fecha: new Date() };
  c.historial.push(ev);
  await c.save();
  return c;
}

module.exports = {
  listar, obtener, crear, recalcular, revisar, aprobar, preview,
  contribucionesDesdeModelo, desviacionEstandarMuestral,
};

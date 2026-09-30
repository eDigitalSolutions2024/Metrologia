const fs = require("fs");
const path = require("path");
const Configuracion = require("../models/Configuracion");
const { laboratorio: laboratorioEnv } = require("../config/env");
const { destinoLogos } = require("../middleware/upload");
const AppError = require("../utils/AppError");

async function obtenerDoc() {
  let cfg = await Configuracion.findOne({ clave: "global" });
  if (!cfg) cfg = await Configuracion.create({ clave: "global" });
  return cfg;
}

async function obtenerMenuPermisos() {
  const cfg = await obtenerDoc();
  return Object.fromEntries(cfg.menuPermisos || []);
}

async function actualizarMenuPermisos(permisos) {
  const cfg = await obtenerDoc();
  cfg.menuPermisos = new Map(Object.entries(permisos || {}));
  await cfg.save();
  return Object.fromEntries(cfg.menuPermisos);
}

// Mientras nadie haya guardado nada desde Administración, se usan los valores
// del .env (LAB_*) como default — así la migración no pierde lo ya configurado.
const NOTA_CERT_DEFAULT =
  "método GUM (JCGM 100:2008) — cálculo determinístico. Verificable en línea con el QR del certificado.";

function remarksPorDefecto(nombreLab) {
  const n = nombreLab || "the laboratory";
  return (
    "The instrument(s) listed in this certification have been calibrated against standards traceable to " +
    "N.I.S.T. (National Institute of Standards and Technology) derived from ratio type measurements, or compared " +
    "to national or internationally recognized consensus standards. A calibration uncertainty ratio of 4:1 was " +
    "maintained and a K=2 coverage factor with a confidence level of 95%, unless otherwise stated. " +
    `${n} quality system complies with applicable requirements of ISO/IEC 17025:2017. All results contained ` +
    "within this certification relate only to item(s) calibrated. This calibration report shall not be reproduced " +
    `except in full and with the written consent of ${n}. Decision rule: Simple acceptance / Shared risk.`
  );
}

async function obtenerLaboratorio() {
  const cfg = await obtenerDoc();
  const nombre = cfg.laboratorio?.nombre || laboratorioEnv.nombre;
  return {
    nombre,
    acreditacion: cfg.laboratorio?.acreditacion || laboratorioEnv.acreditacion,
    rfc: cfg.laboratorio?.rfc || laboratorioEnv.rfc,
    domicilio: cfg.laboratorio?.domicilio || laboratorioEnv.domicilio,
    telefono: cfg.laboratorio?.telefono || laboratorioEnv.telefono,
    remarks: cfg.laboratorio?.remarks || remarksPorDefecto(nombre),
    notaCertificado: cfg.laboratorio?.notaCertificado || NOTA_CERT_DEFAULT,
    regimenFiscal: cfg.laboratorio?.regimenFiscal || "",
    codigoPostalFiscal: cfg.laboratorio?.codigoPostalFiscal || "",
    serieCFDI: cfg.laboratorio?.serieCFDI || "",
  };
}

async function actualizarLaboratorio(datos) {
  const cfg = await obtenerDoc();
  cfg.laboratorio = {
    nombre: datos?.nombre || "",
    acreditacion: datos?.acreditacion || "",
    rfc: datos?.rfc || "",
    domicilio: datos?.domicilio || "",
    telefono: datos?.telefono || "",
    remarks: datos?.remarks?.trim() || "",
    notaCertificado: datos?.notaCertificado?.trim() || "",
    regimenFiscal: datos?.regimenFiscal?.trim() || "",
    codigoPostalFiscal: datos?.codigoPostalFiscal?.trim() || "",
    serieCFDI: datos?.serieCFDI?.trim() || "",
  };
  await cfg.save();
  return obtenerLaboratorio();
}

async function obtenerLogo() {
  const cfg = await obtenerDoc();
  if (!cfg.logo?.nombreArchivo) return null;
  return { nombreArchivo: cfg.logo.nombreArchivo };
}

async function subirLogo(archivo) {
  if (!archivo) throw new AppError("No se recibió ninguna imagen", 400);
  const cfg = await obtenerDoc();

  const anterior = cfg.logo?.nombreArchivo;
  cfg.logo = {
    nombreArchivo: archivo.filename,
    nombreOriginal: archivo.originalname,
    mimetype: archivo.mimetype,
    tamano: archivo.size,
    fecha: new Date(),
  };
  await cfg.save();

  if (anterior) {
    fs.unlink(path.join(destinoLogos, anterior), () => {}); // best-effort, no bloquea la respuesta
  }
  return { nombreArchivo: cfg.logo.nombreArchivo };
}

async function eliminarLogo() {
  const cfg = await obtenerDoc();
  const anterior = cfg.logo?.nombreArchivo;
  cfg.logo = undefined;
  await cfg.save();
  if (anterior) {
    fs.unlink(path.join(destinoLogos, anterior), () => {});
  }
}

const COLORES_DEFAULT = { primario: "#0F172A", secundario: "#2563EB", acento: "#0891B2" };
const HEX_VALIDO = /^#[0-9A-Fa-f]{6}$/;

async function obtenerColores() {
  const cfg = await obtenerDoc();
  return {
    primario: cfg.colores?.primario || COLORES_DEFAULT.primario,
    secundario: cfg.colores?.secundario || COLORES_DEFAULT.secundario,
    acento: cfg.colores?.acento || COLORES_DEFAULT.acento,
  };
}

async function actualizarColores(datos) {
  const primario = datos?.primario || COLORES_DEFAULT.primario;
  const secundario = datos?.secundario || COLORES_DEFAULT.secundario;
  const acento = datos?.acento || COLORES_DEFAULT.acento;
  if (!HEX_VALIDO.test(primario) || !HEX_VALIDO.test(secundario) || !HEX_VALIDO.test(acento)) {
    throw new AppError("Los colores deben ser códigos hexadecimales válidos (#RRGGBB)", 400);
  }
  const cfg = await obtenerDoc();
  cfg.colores = { primario, secundario, acento };
  await cfg.save();
  return cfg.colores;
}

module.exports = {
  obtenerMenuPermisos, actualizarMenuPermisos, obtenerLaboratorio, actualizarLaboratorio,
  obtenerLogo, subirLogo, eliminarLogo,
  obtenerColores, actualizarColores,
};

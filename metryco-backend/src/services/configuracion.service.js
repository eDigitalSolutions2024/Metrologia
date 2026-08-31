const Configuracion = require("../models/Configuracion");
const { laboratorio: laboratorioEnv } = require("../config/env");

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
async function obtenerLaboratorio() {
  const cfg = await obtenerDoc();
  return {
    nombre: cfg.laboratorio?.nombre || laboratorioEnv.nombre,
    acreditacion: cfg.laboratorio?.acreditacion || laboratorioEnv.acreditacion,
    rfc: cfg.laboratorio?.rfc || laboratorioEnv.rfc,
    domicilio: cfg.laboratorio?.domicilio || laboratorioEnv.domicilio,
    telefono: cfg.laboratorio?.telefono || laboratorioEnv.telefono,
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
  };
  await cfg.save();
  return cfg.laboratorio;
}

module.exports = { obtenerMenuPermisos, actualizarMenuPermisos, obtenerLaboratorio, actualizarLaboratorio };

const Configuracion = require("../models/Configuracion");

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

module.exports = { obtenerMenuPermisos, actualizarMenuPermisos };

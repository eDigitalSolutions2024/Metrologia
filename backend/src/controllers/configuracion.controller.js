const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/configuracion.service");

const obtenerMenuPermisos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtenerMenuPermisos() });
});

const actualizarMenuPermisos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizarMenuPermisos(req.body.permisos) });
});

const obtenerLaboratorio = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtenerLaboratorio() });
});

const actualizarLaboratorio = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizarLaboratorio(req.body) });
});

const obtenerLogo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtenerLogo() });
});

const subirLogo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.subirLogo(req.file) });
});

const eliminarLogo = asyncHandler(async (req, res) => {
  await service.eliminarLogo();
  res.json({ success: true, data: null });
});

const obtenerColores = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtenerColores() });
});

const actualizarColores = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizarColores(req.body) });
});

module.exports = {
  obtenerMenuPermisos, actualizarMenuPermisos, obtenerLaboratorio, actualizarLaboratorio,
  obtenerLogo, subirLogo, eliminarLogo,
  obtenerColores, actualizarColores,
};

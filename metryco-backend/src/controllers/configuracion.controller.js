const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/configuracion.service");

const obtenerMenuPermisos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtenerMenuPermisos() });
});

const actualizarMenuPermisos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizarMenuPermisos(req.body.permisos) });
});

module.exports = { obtenerMenuPermisos, actualizarMenuPermisos };

const asyncHandler = require("../utils/asyncHandler");
const actividadService = require("../services/actividad.service");

const listar = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const items = await actividadService.listar({ year, month });
  res.json({ success: true, data: items });
});

const obtener = asyncHandler(async (req, res) => {
  const actividad = await actividadService.obtener(req.params.id);
  res.json({ success: true, data: actividad });
});

const crear = asyncHandler(async (req, res) => {
  const actividad = await actividadService.crear(req.body, req.user?.id);
  res.status(201).json({ success: true, data: actividad });
});

const actualizar = asyncHandler(async (req, res) => {
  const actividad = await actividadService.actualizar(req.params.id, req.body);
  res.json({ success: true, data: actividad });
});

const eliminar = asyncHandler(async (req, res) => {
  const actividad = await actividadService.eliminar(req.params.id);
  res.json({ success: true, data: actividad });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };

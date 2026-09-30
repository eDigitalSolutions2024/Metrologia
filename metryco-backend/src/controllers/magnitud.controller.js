const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/magnitud.service");

const listar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listar(req.query) });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.clave) });
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.crear(req.body) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body) });
});

module.exports = { listar, obtener, crear, actualizar };

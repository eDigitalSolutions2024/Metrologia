const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/razonSocial.service");

const listar = asyncHandler(async (req, res) => {
  const { soloActivas = "" } = req.query;
  res.json({ success: true, data: await service.listar({ soloActivas }) });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.crear(req.body) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };

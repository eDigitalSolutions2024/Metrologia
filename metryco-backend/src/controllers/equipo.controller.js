const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/equipo.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", clienteId = "", categoria = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, clienteId, categoria, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const crear = asyncHandler(async (req, res) => {
  const equipo = await service.crear(req.body, req.user?.id);
  res.status(201).json({ success: true, data: equipo });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };

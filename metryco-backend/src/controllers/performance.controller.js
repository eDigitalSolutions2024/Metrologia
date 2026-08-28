const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/performance.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", magnitud = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, magnitud, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.crear(req.body, req.user?.id) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

// Previsualiza el cálculo de un punto sin guardar (fórmula de tolerancia legacy).
const calcularPunto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: service.calcularPunto(req.body) });
});

module.exports = { listar, obtener, crear, actualizar, eliminar, calcularPunto };

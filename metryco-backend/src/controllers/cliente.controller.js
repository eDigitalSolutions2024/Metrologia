const asyncHandler = require("../utils/asyncHandler");
const clienteService = require("../services/cliente.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", sector = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await clienteService.listar({
    search,
    sector,
    page: Number(page),
    pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  const cliente = await clienteService.obtener(req.params.id);
  res.json({ success: true, data: cliente });
});

const crear = asyncHandler(async (req, res) => {
  const cliente = await clienteService.crear(req.body);
  res.status(201).json({ success: true, data: cliente });
});

const actualizar = asyncHandler(async (req, res) => {
  const cliente = await clienteService.actualizar(req.params.id, req.body);
  res.json({ success: true, data: cliente });
});

const eliminar = asyncHandler(async (req, res) => {
  const cliente = await clienteService.eliminar(req.params.id);
  res.json({ success: true, data: cliente });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };

const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/reporte.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", status = "todos", clienteId = "", mes = "", anio = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, status, clienteId, mes, anio, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const paraImprimir = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.paraImprimir(req.params.id) });
});

const agregarComentario = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.agregarComentario(req.params.id, req.body.texto, req.user) });
});

const crear = asyncHandler(async (req, res) => {
  // Cualquiera puede iniciar un reporte — la autoría queda en el historial.
  res.status(201).json({ success: true, data: await service.crear(req.body, req.user) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body, req.user) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

module.exports = { listar, obtener, crear, actualizar, eliminar, paraImprimir, agregarComentario };

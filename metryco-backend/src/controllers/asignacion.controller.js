const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/asignacion.service");

const listar = asyncHandler(async (req, res) => {
  const { reporteId = "", estadoCertificado = "", estadoCalibracion = "", tecnicoAsignado = "", page = 0, pageSize = 20 } = req.query;
  const { items, total } = await service.listar({
    reporteId, estadoCertificado, estadoCalibracion, tecnicoAsignado, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const calidad = asyncHandler(async (req, res) => {
  const { clienteId = "" } = req.query;
  res.json({ success: true, data: await service.listarParaCalidad({ clienteId }) });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.crear(req.body, req.user) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body, req.user) });
});

const cambiarEstado = asyncHandler(async (req, res) => {
  const { dominio, valor, motivo } = req.body;
  res.json({ success: true, data: await service.cambiarEstado(req.params.id, { dominio, valor, motivo }, req.user) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

module.exports = { listar, calidad, obtener, crear, actualizar, cambiarEstado, eliminar };

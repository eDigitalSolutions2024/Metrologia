const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/factura.service");

const listar = asyncHandler(async (req, res) => {
  const { clienteId = "" } = req.query;
  res.json({ success: true, data: await service.listar({ clienteId }) });
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.crear(req.body, req.user?.id) });
});

const aplicarPago = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.aplicarPago(req.params.id, req.body.fechaPagada, req.user?.id) });
});

const reabrir = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.reabrir(req.params.id) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

const registrarAbono = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.registrarAbono(req.params.id, req.body, req.user?.id) });
});

const eliminarAbono = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminarAbono(req.params.id, req.params.abonoId) });
});

module.exports = { listar, crear, aplicarPago, reabrir, eliminar, registrarAbono, eliminarAbono };

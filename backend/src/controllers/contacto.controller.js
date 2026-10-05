const asyncHandler = require("../utils/asyncHandler");
const contactoService = require("../services/contacto.service");

const listar = asyncHandler(async (req, res) => {
  const contactos = await contactoService.listarPorCliente(req.params.clienteId);
  res.json({ success: true, data: contactos });
});

const crear = asyncHandler(async (req, res) => {
  const contacto = await contactoService.crear(req.params.clienteId, req.body);
  res.status(201).json({ success: true, data: contacto });
});

const actualizar = asyncHandler(async (req, res) => {
  const contacto = await contactoService.actualizar(req.params.clienteId, req.params.id, req.body);
  res.json({ success: true, data: contacto });
});

const eliminar = asyncHandler(async (req, res) => {
  const contacto = await contactoService.eliminar(req.params.clienteId, req.params.id);
  res.json({ success: true, data: contacto });
});

module.exports = { listar, crear, actualizar, eliminar };

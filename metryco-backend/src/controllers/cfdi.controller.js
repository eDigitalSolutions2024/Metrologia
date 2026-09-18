const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/cfdi.service");

const listar = asyncHandler(async (req, res) => {
  const { clienteId = "", estado = "", page = 0, pageSize = 20 } = req.query;
  const { items, total } = await service.listar({ clienteId, estado, page: Number(page), pageSize: Number(pageSize) });
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

const timbrar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.timbrar(req.params.id, req.user?.id) });
});

const cancelar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.cancelar(req.params.id, req.body) });
});

const previsualizarXml = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.previsualizarXml(req.params.id) });
});

const descargarXml = asyncHandler(async (req, res) => {
  const { xml, nombre } = await service.obtenerXml(req.params.id);
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

const descargarPdf = asyncHandler(async (req, res) => {
  const { buffer, nombre } = await service.obtenerPdf(req.params.id);
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  res.setHeader("Content-Type", "application/pdf");
  res.send(buffer);
});

module.exports = { listar, obtener, crear, actualizar, timbrar, cancelar, previsualizarXml, descargarXml, descargarPdf };

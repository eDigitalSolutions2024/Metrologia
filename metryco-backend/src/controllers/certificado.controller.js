const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/certificado.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", clienteId = "", estado = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, clienteId, estado, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const exportar = asyncHandler(async (req, res) => {
  const { clienteId = "", mes = "", anio = "", factura = "todos" } = req.query;
  res.json({ success: true, data: await service.exportar({ clienteId, mes, anio, factura }) });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const porReporte = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.porReporte(req.params.reporteId) });
});

const emitir = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.emitir(req.body, req.user) });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body, req.user) });
});

const cambiarEstado = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.cambiarEstado(req.params.id, req.body.estado, req.user) });
});

const adjuntarPdf = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adjuntarPdf(req.params.id, req.file, req.user) });
});

const anular = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.anular(req.params.id, req.body.motivo, req.user) });
});

const regenerarToken = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.regenerarToken(req.params.id, req.user) });
});

const qrPng = asyncHandler(async (req, res) => {
  const buf = await service.qrPng(req.params.id);
  res.type("png").send(buf);
});

const qrSvg = asyncHandler(async (req, res) => {
  const svg = await service.qrSvg(req.params.id);
  res.type("svg").send(svg);
});

const descargarPdf = asyncHandler(async (req, res) => {
  const { ruta, nombre } = await service.archivoStream(req.params.id);
  res.download(ruta, nombre);
});

module.exports = {
  listar, obtener, exportar, emitir, actualizar, cambiarEstado, adjuntarPdf,
  anular, regenerarToken, qrPng, qrSvg, descargarPdf, porReporte,
};

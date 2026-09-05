const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/patron.service");

const siguienteCodigo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { codigo: await service.siguienteCodigo() } });
});

const listar = asyncHandler(async (req, res) => {
  const { search = "", categoria = "", vigencia = "", estado = "", page = 0, pageSize = 50 } = req.query;
  const { items, total } = await service.listar({
    search, categoria, vigencia, estado, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
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

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

const adjuntarPdf = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adjuntarPdf(req.params.id, req.file, req.user) });
});

const porVencer = asyncHandler(async (req, res) => {
  const dias = Number(req.query.dias) || 30;
  res.json({ success: true, data: await service.porVencer(dias) });
});

const adjuntarCertificado = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adjuntarCertificado(req.params.id, req.file) });
});

const descargarCertificado = asyncHandler(async (req, res) => {
  const { ruta, nombre } = await service.archivoStream(req.params.id);
  res.download(ruta, nombre);
});

const qrPng = asyncHandler(async (req, res) => {
  res.type("png").send(await service.qrPng(req.params.id));
});

const qrSvg = asyncHandler(async (req, res) => {
  res.type("svg").send(await service.qrSvg(req.params.id));
});

module.exports = {
  listar, obtener, crear, actualizar, eliminar, adjuntarPdf, porVencer,
  adjuntarCertificado, descargarCertificado, qrPng, qrSvg, siguienteCodigo,
};

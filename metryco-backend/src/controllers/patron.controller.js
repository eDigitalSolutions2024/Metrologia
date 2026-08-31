const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/patron.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", categoria = "", soloVigentes = "", page = 0, pageSize = 50 } = req.query;
  const { items, total } = await service.listar({
    search, categoria, soloVigentes, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.params.id) });
});

const crear = asyncHandler(async (req, res) => {
  const patron = await service.crear(req.body, req.user?.id);
  res.status(201).json({ success: true, data: patron });
});

const actualizar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actualizar(req.params.id, req.body) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
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

module.exports = { listar, obtener, crear, actualizar, eliminar, porVencer, adjuntarCertificado, descargarCertificado };

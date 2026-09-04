const asyncHandler = require("../utils/asyncHandler");
const cotizacionService = require("../services/cotizacion.service");

const listar = asyncHandler(async (req, res) => {
  const { search = "", status = "todos", mes = "", anio = "", clienteId = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await cotizacionService.listar({
    search,
    status,
    mes,
    anio,
    clienteId,
    page: Number(page),
    pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  const cotizacion = await cotizacionService.obtener(req.params.id);
  res.json({ success: true, data: cotizacion });
});

const crear = asyncHandler(async (req, res) => {
  const cotizacion = await cotizacionService.crear(req.body, req.user.id);
  res.status(201).json({ success: true, data: cotizacion });
});

const actualizar = asyncHandler(async (req, res) => {
  const cotizacion = await cotizacionService.actualizar(req.params.id, req.body);
  res.json({ success: true, data: cotizacion });
});

const eliminar = asyncHandler(async (req, res) => {
  await cotizacionService.eliminar(req.params.id);
  res.json({ success: true });
});

const paraImprimir = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await cotizacionService.paraImprimir(req.params.id) });
});

const subirAdjunto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await cotizacionService.subirAdjunto(req.params.id, req.file, req.user?.id) });
});

const descargarAdjunto = asyncHandler(async (req, res) => {
  const { ruta, nombre } = await cotizacionService.archivoAdjuntoStream(req.params.id, req.params.adjuntoId);
  res.download(ruta, nombre);
});

const eliminarAdjunto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await cotizacionService.eliminarAdjunto(req.params.id, req.params.adjuntoId) });
});

module.exports = {
  listar, obtener, crear, actualizar, eliminar, paraImprimir,
  subirAdjunto, descargarAdjunto, eliminarAdjunto,
};

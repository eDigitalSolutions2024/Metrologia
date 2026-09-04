const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/performance.service");
const AppError = require("../utils/AppError");

const listar = asyncHandler(async (req, res) => {
  const { search = "", magnitud = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, magnitud, page: Number(page), pageSize: Number(pageSize),
  });
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

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

// Previsualiza el cálculo de un punto sin guardar (fórmula de tolerancia legacy).
const calcularPunto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: service.calcularPunto(req.body) });
});

// Parsea el Excel/CSV y devuelve los puntos ya calculados, SIN guardar —
// el técnico los revisa en el formulario antes de confirmar.
const importar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No se recibió ningún archivo", 400);
  const puntos = await service.importarArchivo(req.file.buffer, req.file.originalname);
  res.json({ success: true, data: puntos });
});

module.exports = { listar, obtener, crear, actualizar, eliminar, calcularPunto, importar };

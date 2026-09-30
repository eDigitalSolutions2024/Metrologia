const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const modelos = require("../services/modeloIncertidumbre.service");
const calculos = require("../services/calculoIncertidumbre.service");
const asistente = require("../services/asistente.service");
const { extraerTexto } = require("../utils/extraerDocumento");

/* ---------- Modelos / plantillas ---------- */
const listarModelos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await modelos.listar(req.query) });
});
const obtenerModelo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await modelos.obtener(req.params.id) });
});
const crearModelo = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await modelos.crear(req.body, req.user?.id) });
});
const actualizarModelo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await modelos.actualizar(req.params.id, req.body) });
});
const eliminarModelo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await modelos.eliminar(req.params.id) });
});

// Sube un Word/Excel con un presupuesto de incertidumbre "tal cual lo usan"
// y la IA lo interpreta para precargar el formulario de plantilla nueva.
// No guarda nada en la base de datos — el técnico revisa y da Guardar.
const importarModelo = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("Selecciona un archivo Word (.docx) o Excel (.xlsx/.xls)", 400);
  const texto = await extraerTexto(req.file.buffer, req.file.originalname);
  const data = await asistente.interpretarPlantillaIncertidumbre({ texto, nombreArchivo: req.file.originalname });
  res.json({ success: true, data });
});

/* ---------- Cálculos ejecutados ---------- */
const listarCalculos = asyncHandler(async (req, res) => {
  const { page = 0, pageSize = 20 } = req.query;
  const { items, total } = await calculos.listar({
    ...req.query,
    page: Number(page),
    pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});
const obtenerCalculo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.obtener(req.params.id) });
});
const crearCalculo = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await calculos.crear(req.body, req.user) });
});
const recalcular = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.recalcular(req.params.id, req.body, req.user) });
});
const revisar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.revisar(req.params.id, req.user) });
});
const aprobar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.aprobar(req.params.id, req.user) });
});

// Aprueba de un jalón todos los cálculos calculados/revisados de una
// asignación — usado por "Aprobar y autorizar certificado" en el detalle
// del Reporte, para no aprobar punto por punto.
const aprobarPorAsignacion = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.aprobarPorAsignacion(req.params.asignacionId, req.user) });
});

// "Editar calibración": reemplaza el juego completo de cálculos de una
// asignación por el que manda el popup (borra los previos no aprobados y
// crea los nuevos). Evita que "editar" acumule cálculos duplicados.
const reemplazarPorAsignacion = asyncHandler(async (req, res) => {
  const lista = req.body?.calculos || req.body;
  res.json({ success: true, data: await calculos.reemplazarPorAsignacion(req.params.asignacionId, lista, req.user) });
});

// Cálculo determinístico SIN persistir — para la vista previa "en vivo".
const preview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calculos.preview(req.body) });
});

/* ---------- Asistente virtual (IA de apoyo, no calcula) ---------- */
const asistir = asyncHandler(async (req, res) => {
  const { contexto, pregunta } = req.body || {};
  res.json({ success: true, data: await asistente.asistir({ contexto, pregunta }) });
});

module.exports = {
  listarModelos, obtenerModelo, crearModelo, actualizarModelo, eliminarModelo, importarModelo,
  listarCalculos, obtenerCalculo, crearCalculo, recalcular, revisar, aprobar, aprobarPorAsignacion,
  reemplazarPorAsignacion, preview,
  asistir,
};

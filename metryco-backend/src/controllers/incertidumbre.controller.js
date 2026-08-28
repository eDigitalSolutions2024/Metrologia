const asyncHandler = require("../utils/asyncHandler");
const modelos = require("../services/modeloIncertidumbre.service");
const calculos = require("../services/calculoIncertidumbre.service");
const asistente = require("../services/asistente.service");

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

/* ---------- Cálculos ejecutados ---------- */
const listarCalculos = asyncHandler(async (req, res) => {
  const { page = 0, pageSize = 20 } = req.query;
  res.json({
    success: true,
    ...(await calculos.listar({ ...req.query, page: Number(page), pageSize: Number(pageSize) })),
  });
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

// Cálculo determinístico SIN persistir — para la vista previa "en vivo".
const preview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: calculos.preview(req.body) });
});

/* ---------- Asistente virtual (IA de apoyo, no calcula) ---------- */
const asistir = asyncHandler(async (req, res) => {
  const { contexto, pregunta } = req.body || {};
  res.json({ success: true, data: await asistente.asistir({ contexto, pregunta }) });
});

module.exports = {
  listarModelos, obtenerModelo, crearModelo, actualizarModelo, eliminarModelo,
  listarCalculos, obtenerCalculo, crearCalculo, recalcular, revisar, aprobar, preview,
  asistir,
};

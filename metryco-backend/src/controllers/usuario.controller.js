const asyncHandler = require("../utils/asyncHandler");
const usuarioService = require("../services/usuario.service");

const directorio = asyncHandler(async (req, res) => {
  const usuarios = await usuarioService.directorio();
  res.json({ success: true, data: usuarios });
});

const listar = asyncHandler(async (req, res) => {
  const { search = "", status = "", rol = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await usuarioService.listar({
    search,
    status,
    rol,
    page: Number(page),
    pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

const obtener = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.obtener(req.params.id);
  res.json({ success: true, data: usuario });
});

const crear = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.crear(req.body);
  res.status(201).json({ success: true, data: usuario });
});

const actualizar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.actualizar(req.params.id, req.body);
  res.json({ success: true, data: usuario });
});

const desactivar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.desactivar(req.params.id);
  res.json({ success: true, data: usuario });
});

const reactivar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.reactivar(req.params.id);
  res.json({ success: true, data: usuario });
});

const eliminar = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, message: "No puedes eliminar tu propio usuario." });
  }
  await usuarioService.eliminar(req.params.id);
  res.json({ success: true, data: null });
});

const agregarObservacion = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.agregarObservacion(
    req.params.id,
    req.body.texto,
    req.user.usuario
  );
  res.status(201).json({ success: true, data: usuario });
});

const eliminarObservacion = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.eliminarObservacion(req.params.id, req.params.obsId);
  res.json({ success: true, data: usuario });
});

module.exports = {
  listar, obtener, crear, actualizar, desactivar, reactivar, eliminar,
  agregarObservacion, eliminarObservacion, directorio,
};

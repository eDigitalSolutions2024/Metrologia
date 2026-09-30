const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/perfil.service");

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.user.id) });
});

const cambiarPassword = asyncHandler(async (req, res) => {
  await service.cambiarPassword(req.user.id, req.body.passwordActual, req.body.passwordNueva);
  res.json({ success: true, data: null });
});

const elegirColorAvatar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.elegirColorAvatar(req.user.id, req.body.color) });
});

const subirFoto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.subirFoto(req.user.id, req.file) });
});

const eliminarFoto = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminarFoto(req.user.id) });
});

const subirFirma = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.subirFirma(req.user.id, req.file) });
});

const eliminarFirma = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminarFirma(req.user.id) });
});

const actividadReciente = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.actividadReciente(req.user.usuario) });
});

const coloresDisponibles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: service.AVATAR_COLORES });
});

module.exports = {
  obtener, cambiarPassword, elegirColorAvatar, subirFoto, eliminarFoto,
  subirFirma, eliminarFirma, actividadReciente, coloresDisponibles,
};

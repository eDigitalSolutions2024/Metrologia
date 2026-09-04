const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/equipo.service");

// El técnico no debe ver ni fijar el costo del equipo (regla del sistema
// legacy). Se aplica aquí, no solo en el frontend, para que llamar a la API
// directo tampoco lo exponga ni permita cambiarlo.
function ocultarCosto(equipo) {
  if (!equipo) return equipo;
  const obj = equipo.toObject ? equipo.toObject() : equipo;
  const { costo, moneda, ...resto } = obj;
  return resto;
}

const listar = asyncHandler(async (req, res) => {
  const { search = "", clienteId = "", categoria = "", incluirInactivos = "", page = 0, pageSize = 10 } = req.query;
  const { items, total } = await service.listar({
    search, clienteId, categoria, incluirInactivos: incluirInactivos === "true", page: Number(page), pageSize: Number(pageSize),
  });
  const data = req.user?.rol === "tecnico" ? items.map(ocultarCosto) : items;
  res.json({ success: true, data, total });
});

const obtener = asyncHandler(async (req, res) => {
  const equipo = await service.obtener(req.params.id);
  res.json({ success: true, data: req.user?.rol === "tecnico" ? ocultarCosto(equipo) : equipo });
});

const crear = asyncHandler(async (req, res) => {
  const datos = req.user?.rol === "tecnico" ? ocultarCosto(req.body) : req.body;
  const equipo = await service.crear(datos, req.user?.id);
  res.status(201).json({ success: true, data: equipo });
});

const actualizar = asyncHandler(async (req, res) => {
  const datos = req.user?.rol === "tecnico" ? ocultarCosto(req.body) : req.body;
  res.json({ success: true, data: await service.actualizar(req.params.id, datos) });
});

const eliminar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.eliminar(req.params.id) });
});

const reactivar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.reactivar(req.params.id) });
});

const qrPng = asyncHandler(async (req, res) => {
  res.type("png").send(await service.qrPng(req.params.id));
});

const qrSvg = asyncHandler(async (req, res) => {
  res.type("svg").send(await service.qrSvg(req.params.id));
});

module.exports = { listar, obtener, crear, actualizar, eliminar, reactivar, qrPng, qrSvg };

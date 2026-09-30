const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/auditoria.service");

const listar = asyncHandler(async (req, res) => {
  const { accion = "", usuario = "", exito = "", desde = "", hasta = "", page = 0, pageSize = 50 } = req.query;
  const { items, total } = await service.listar({
    accion, usuario, exito, desde, hasta, page: Number(page), pageSize: Number(pageSize),
  });
  res.json({ success: true, data: items, total });
});

module.exports = { listar };

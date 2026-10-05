const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/alerta.service");

const obtener = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.obtener(req.user) });
});

module.exports = { obtener };

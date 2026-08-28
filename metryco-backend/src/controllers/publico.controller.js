const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/publico.service");

function meta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
    userAgent: req.headers["user-agent"],
  };
}

const verificar = asyncHandler(async (req, res) => {
  const data = await service.verificar(req.params.token, meta(req));
  res.json({ success: true, data });
});

const qr = asyncHandler(async (req, res) => {
  const buf = await service.qrPngPorToken(req.params.token);
  res.type("png").set("Cache-Control", "public, max-age=86400").send(buf);
});

const pdf = asyncHandler(async (req, res) => {
  const { ruta, nombre } = await service.pdfPorToken(req.params.token);
  res.download(ruta, nombre);
});

module.exports = { verificar, qr, pdf };

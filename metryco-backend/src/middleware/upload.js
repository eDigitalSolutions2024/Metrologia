const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const AppError = require("../utils/AppError");
const { uploadsDir } = require("../config/env");

function soloPdf(_req, file, cb) {
  if (file.mimetype === "application/pdf") return cb(null, true);
  cb(new AppError("Sólo se permiten archivos PDF", 400));
}

function storageEn(subcarpeta) {
  const destino = path.join(uploadsDir, subcarpeta);
  fs.mkdirSync(destino, { recursive: true });
  return {
    destino,
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destino),
      filename: (_req, _file, cb) =>
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`),
    }),
  };
}

const certificados = storageEn("certificados");
const patrones = storageEn("patrones");

function envolver(handler) {
  return (req, res, next) =>
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === "LIMIT_FILE_SIZE" ? "El PDF supera el tamaño máximo (15 MB)" : err.message;
        return next(new AppError(msg, 400));
      }
      if (err) return next(err);
      next();
    });
}

const LIMITES = { fileSize: 15 * 1024 * 1024, files: 1 };

const pdfCertificado = envolver(
  multer({ storage: certificados.storage, fileFilter: soloPdf, limits: LIMITES }).single("archivo")
);
const pdfPatron = envolver(
  multer({ storage: patrones.storage, fileFilter: soloPdf, limits: LIMITES }).single("archivo")
);

module.exports = {
  pdfCertificado,
  pdfPatron,
  destinoCertificados: certificados.destino,
  destinoPatrones: patrones.destino,
};

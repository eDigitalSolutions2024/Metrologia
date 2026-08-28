const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const AppError = require("../utils/AppError");
const { uploadsDir } = require("../config/env");

const destinoCertificados = path.join(uploadsDir, "certificados");
fs.mkdirSync(destinoCertificados, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, destinoCertificados),
  filename: (_req, _file, cb) => {
    const nombre = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;
    cb(null, nombre);
  },
});

function soloPdf(_req, file, cb) {
  if (file.mimetype === "application/pdf") return cb(null, true);
  cb(new AppError("Sólo se permiten archivos PDF", 400));
}

const subirPdfCertificado = multer({
  storage,
  fileFilter: soloPdf,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
}).single("archivo");

/** Envuelve multer para que sus errores salgan como AppError con 4xx. */
function pdfCertificado(req, res, next) {
  subirPdfCertificado(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === "LIMIT_FILE_SIZE" ? "El PDF supera el tamaño máximo (15 MB)" : err.message;
      return next(new AppError(msg, 400));
    }
    if (err) return next(err);
    next();
  });
}

module.exports = { pdfCertificado, destinoCertificados };

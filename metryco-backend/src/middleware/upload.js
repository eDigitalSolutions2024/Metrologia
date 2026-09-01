const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const AppError = require("../utils/AppError");
const { uploadsDir } = require("../config/env");

const destinoCertificados = path.join(uploadsDir, "certificados");
fs.mkdirSync(destinoCertificados, { recursive: true });

const destinoLogos = path.join(uploadsDir, "logos");
fs.mkdirSync(destinoLogos, { recursive: true });

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

const MIME_IMAGENES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

const storageLogo = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, destinoLogos),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function soloImagen(_req, file, cb) {
  if (MIME_IMAGENES.includes(file.mimetype)) return cb(null, true);
  cb(new AppError("Solo se permiten imágenes PNG, JPG, SVG o WEBP", 400));
}

const subirImagenLogo = multer({
  storage: storageLogo,
  fileFilter: soloImagen,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
}).single("archivo");

function logo(req, res, next) {
  subirImagenLogo(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "La imagen supera el tamaño máximo (3 MB)" : err.message;
      return next(new AppError(msg, 400));
    }
    if (err) return next(err);
    next();
  });
}

// Fábrica reutilizada para las imágenes del perfil (foto y firma) — mismo
// patrón que el logo, solo cambia la carpeta destino y el tamaño máximo.
function crearSubidaImagen(carpeta, maxMB) {
  const destino = path.join(uploadsDir, carpeta);
  fs.mkdirSync(destino, { recursive: true });

  const storageImg = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destino),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });

  const subir = multer({
    storage: storageImg,
    fileFilter: soloImagen,
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
  }).single("archivo");

  const middleware = (req, res, next) => {
    subir(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === "LIMIT_FILE_SIZE" ? `La imagen supera el tamaño máximo (${maxMB} MB)` : err.message;
        return next(new AppError(msg, 400));
      }
      if (err) return next(err);
      next();
    });
  };

  return { middleware, destino };
}

const { middleware: fotoPerfil, destino: destinoFotos } = crearSubidaImagen("fotos-perfil", 3);
const { middleware: firma, destino: destinoFirmas } = crearSubidaImagen("firmas", 2);

module.exports = {
  pdfCertificado, destinoCertificados, logo, destinoLogos,
  fotoPerfil, destinoFotos, firma, destinoFirmas,
};

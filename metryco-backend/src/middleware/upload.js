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

// --- Imágenes (logo del laboratorio, foto y firma del perfil, gráfica de calibración) ---
const MIME_IMAGENES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

function soloImagen(_req, file, cb) {
  if (MIME_IMAGENES.includes(file.mimetype)) return cb(null, true);
  cb(new AppError("Solo se permiten imágenes PNG, JPG, SVG o WEBP", 400));
}

// Fábrica reutilizada para las imágenes del sistema (logo, foto y firma del
// perfil, gráfica de calibración) — mismo patrón, solo cambia la carpeta
// destino y el tamaño máximo.
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

const { middleware: logo, destino: destinoLogos } = crearSubidaImagen("logos", 3);
const { middleware: fotoPerfil, destino: destinoFotos } = crearSubidaImagen("fotos-perfil", 3);
const { middleware: firma, destino: destinoFirmas } = crearSubidaImagen("firmas", 2);
const { middleware: grafica, destino: destinoGraficas } = crearSubidaImagen("graficas", 8);

// Adjuntos extra de Cotización: cualquier tipo de archivo (el legacy no
// restringe el tipo — pueden ser fichas técnicas, imágenes, Excel, etc.).
function crearSubidaArchivo(carpeta, maxMB) {
  const destino = path.join(uploadsDir, carpeta);
  fs.mkdirSync(destino, { recursive: true });

  const storageArchivo = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destino),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });

  const subir = multer({
    storage: storageArchivo,
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
  }).single("archivo");

  const middleware = (req, res, next) => {
    subir(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === "LIMIT_FILE_SIZE" ? `El archivo supera el tamaño máximo (${maxMB} MB)` : err.message;
        return next(new AppError(msg, 400));
      }
      if (err) return next(err);
      next();
    });
  };

  return { middleware, destino };
}

const { middleware: adjuntoCotizacion, destino: destinoAdjuntosCotizacion } = crearSubidaArchivo("adjuntos-cotizacion", 15);

module.exports = {
  pdfCertificado,
  pdfPatron,
  destinoCertificados: certificados.destino,
  destinoPatrones: patrones.destino,
  logo, destinoLogos,
  fotoPerfil, destinoFotos,
  firma, destinoFirmas,
  grafica, destinoGraficas,
  adjuntoCotizacion, destinoAdjuntosCotizacion,
};

require("dotenv/config");
const path = require("path");

const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno requeridas: ${missing.join(", ")}. Revisa .env.example.`
  );
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

// Placeholders de .env.example que nunca deben llegar a producción.
const PLACEHOLDERS = ["change-me", "change-me-too"];
if (isProd) {
  const inseguros = ["JWT_SECRET", "JWT_REFRESH_SECRET"].filter((key) =>
    PLACEHOLDERS.includes(process.env[key])
  );
  if (inseguros.length > 0) {
    throw new Error(
      `No se puede arrancar en producción con secretos de ejemplo sin cambiar: ${inseguros.join(", ")}.`
    );
  }
  if (!process.env.CORS_ORIGIN) {
    throw new Error(
      "CORS_ORIGIN es obligatorio en producción (debe ser el dominio real del frontend, no localhost)."
    );
  }
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI,
  corsOrigin:
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGIN
      : [process.env.CORS_ORIGIN || "http://localhost:5173", "http://localhost:5174"],
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // URL pública del frontend — se usa para armar el enlace que va dentro del QR
  // del certificado (…/certificado/ver/<token>).
  publicWebUrl:
    process.env.PUBLIC_WEB_URL || process.env.CORS_ORIGIN || "http://localhost:5174",

  // Carpeta local donde se guardan archivos subidos (PDFs de certificados, etc.).
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads"),

  // Datos del laboratorio que aparecen en la verificación pública del certificado
  // y en los documentos imprimibles (Reporte de Servicio, Entrega, etc.).
  laboratorio: {
    nombre: process.env.LAB_NOMBRE || "Laboratorio de Metrología",
    acreditacion: process.env.LAB_ACREDITACION || "",
    rfc: process.env.LAB_RFC || "",
    domicilio: process.env.LAB_DOMICILIO || "",
    telefono: process.env.LAB_TELEFONO || "",
  },
};

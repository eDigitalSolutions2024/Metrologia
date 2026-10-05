const fs = require("fs");
const crypto = require("crypto");
const Certificado = require("../models/Certificado");
const AppError = require("../utils/AppError");
const qr = require("../utils/qr");
const { rutaArchivo, urlPublica } = require("./certificado.service");

const TOKEN_RX = /^[a-f0-9]{24,64}$/i;

function hashIp(ip) {
  if (!ip) return undefined;
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

/**
 * Consulta pública de un certificado por su token opaco. Devuelve SÓLO campos
 * apropiados para mostrar a cualquiera que escanee el QR: nada de IDs internos,
 * RFC, domicilio, contactos, montos, ni historial.
 */
async function verificar(token, meta = {}) {
  if (!TOKEN_RX.test(token || "")) {
    // Respuesta genérica: no revela si el token existe o no.
    throw new AppError("Certificado no encontrado", 404);
  }

  const cert = await Certificado.findOne({ publicToken: token });
  if (!cert) throw new AppError("Certificado no encontrado", 404);

  // Bitácora de verificación (trazabilidad de consultas). Sin IP en claro.
  const registro = {
    fecha: new Date(),
    ipHash: hashIp(meta.ip),
    userAgent: (meta.userAgent || "").slice(0, 180),
  };
  await Certificado.updateOne({ _id: cert._id }, { $push: { verificaciones: registro } });

  const estado = cert.estadoCalculado();

  return {
    folio: cert.folio,
    estado, // vigente | por_vencer | vencido | anulado | borrador
    valido: ["vigente", "por_vencer"].includes(estado),
    equipo: {
      identificacion: cert.equipoSnapshot?.idInterno,
      descripcion: cert.equipoSnapshot?.descripcion,
      marca: cert.equipoSnapshot?.marca,
      modelo: cert.equipoSnapshot?.modelo,
      serie: cert.equipoSnapshot?.serie,
      magnitud: cert.equipoSnapshot?.categoria,
    },
    cliente: cert.clienteSnapshot?.nombre || undefined,
    fechaCalibracion: cert.fechaCalibracion,
    fechaEmision: cert.fechaEmision,
    vigencia: cert.vigencia || undefined,
    resultado: cert.resultado?.incertidumbreExpandida
      ? {
          valorMedido: cert.resultado.valorMedido,
          unidad: cert.resultado.unidad,
          incertidumbreExpandida: cert.resultado.incertidumbreExpandida,
          k: cert.resultado.k,
          nivelConfianza: cert.resultado.nivelConfianza,
        }
      : undefined,
    puntos: (cert.puntos || []).map((p) => ({
      mensurando: p.mensurando,
      puntoNominal: p.puntoNominal,
      valorMedido: p.valorMedido,
      unidad: p.unidad,
      incertidumbreExpandida: p.incertidumbreExpandida,
      k: p.k,
      nivelConfianza: p.nivelConfianza,
    })),
    trazabilidad: (cert.patronesSnapshot || [])
      .map((p) => p.trazabilidad)
      .filter(Boolean),
    laboratorio: cert.laboratorio,
    tienePdf: !!cert.archivo?.nombreArchivo,
    anulado: estado === "anulado" ? { motivo: cert.anulacion?.motivo, fecha: cert.anulacion?.fecha } : undefined,
    consultadoEn: new Date(),
  };
}

async function qrPngPorToken(token) {
  if (!TOKEN_RX.test(token || "")) throw new AppError("Certificado no encontrado", 404);
  const cert = await Certificado.findOne({ publicToken: token }).select("publicToken");
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  return qr.pngBuffer(urlPublica(cert.publicToken));
}

async function pdfPorToken(token) {
  if (!TOKEN_RX.test(token || "")) throw new AppError("Certificado no encontrado", 404);
  const cert = await Certificado.findOne({ publicToken: token });
  if (!cert) throw new AppError("Certificado no encontrado", 404);
  if (cert.estadoCalculado() === "anulado") throw new AppError("Certificado anulado", 410);
  const ruta = rutaArchivo(cert);
  if (!ruta || !fs.existsSync(ruta)) throw new AppError("Sin PDF disponible", 404);
  return { ruta, nombre: `${cert.folio}.pdf` };
}

module.exports = { verificar, qrPngPorToken, pdfPorToken };

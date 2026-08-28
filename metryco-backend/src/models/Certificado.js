const { Schema, model } = require("mongoose");
const crypto = require("crypto");
const { eventoSchema } = require("./_shared");

/**
 * Certificado de calibración. En el legacy el "certificado" era sólo un estado
 * de la asignación; aquí es una entidad propia con:
 *  - folio legible (CERT-2026-0001)
 *  - token público OPACO para el QR (no expone IDs internos)
 *  - SNAPSHOT inmutable del equipo/patrones al momento de emitir (si luego se
 *    edita el equipo, los certificados históricos no cambian)
 *  - bitácora de verificaciones públicas (quién/cuándo escaneó el QR)
 *  - historial de auditoría (nunca se sobreescribe)
 */
const ESTADOS = ["borrador", "vigente", "por_vencer", "vencido", "anulado"];

function nuevoToken() {
  // 32 hex chars, URL-safe, no secuencial, no adivinable.
  return crypto.randomBytes(16).toString("hex");
}

const certificadoSchema = new Schema(
  {
    folio: { type: String, required: true, unique: true },
    publicToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: nuevoToken,
    },

    asignacion: { type: Schema.Types.ObjectId, ref: "Asignacion", index: true },
    reporte: { type: Schema.Types.ObjectId, ref: "Reporte" },
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },
    equipo: { type: Schema.Types.ObjectId, ref: "Equipo" },

    // Snapshot inmutable (se llena al emitir).
    equipoSnapshot: {
      idInterno: String,
      marca: String,
      modelo: String,
      serie: String,
      descripcion: String,
      categoria: String,
    },
    clienteSnapshot: { nombre: String },
    patronesSnapshot: [
      { codigo: String, nombre: String, trazabilidad: String, incertidumbre: String },
    ],

    laboratorio: { nombre: String, acreditacion: String },

    fechaCalibracion: { type: Date, required: true },
    fechaEmision: { type: Date, default: Date.now },
    vigencia: Date, // opcional — "cuando aplique"

    estado: { type: String, enum: ESTADOS, default: "borrador" },

    // Resultado resumido de incertidumbre (el detalle vive en CalculoIncertidumbre).
    resultado: {
      valorMedido: Number,
      unidad: String,
      incertidumbreExpandida: Number,
      k: Number,
      nivelConfianza: String, // "~95%"
    },

    // Un renglón por punto de calibración — snapshot de los CalculoIncertidumbre
    // APROBADOS de la asignación al momento de emitir. No cambian después.
    puntos: [
      {
        calculo: { type: Schema.Types.ObjectId, ref: "CalculoIncertidumbre" },
        folioCalculo: String,
        mensurando: String,
        puntoNominal: Number,
        valorMedido: Number,
        unidad: String,
        uCombinada: Number,
        incertidumbreExpandida: Number,
        k: Number,
        nivelConfianza: String,
        _id: false,
      },
    ],

    archivo: {
      nombreArchivo: String, // nombre en disco
      nombreOriginal: String,
      mimetype: String,
      tamano: Number,
      subidoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
      fecha: Date,
    },

    verificaciones: [
      {
        fecha: { type: Date, default: Date.now },
        ipHash: String, // hash, nunca la IP en claro
        userAgent: String,
        _id: false,
      },
    ],

    anulacion: {
      motivo: String,
      usuario: { id: { type: Schema.Types.ObjectId, ref: "Usuario" }, nombre: String },
      fecha: Date,
    },

    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    historial: [eventoSchema],
  },
  { timestamps: true }
);

certificadoSchema.statics.ESTADOS = ESTADOS;
certificadoSchema.statics.nuevoToken = nuevoToken;

/** Estado derivado por fechas (no toca `anulado` ni `borrador`). */
certificadoSchema.methods.estadoCalculado = function () {
  if (this.estado === "anulado" || this.estado === "borrador") return this.estado;
  if (!this.vigencia) return "vigente";
  const dias = Math.ceil((new Date(this.vigencia) - new Date()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "por_vencer";
  return "vigente";
};

module.exports = model("Certificado", certificadoSchema);

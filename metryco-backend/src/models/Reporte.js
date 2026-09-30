const { Schema, model } = require("mongoose");
const { eventoSchema } = require("./_shared");

/**
 * Reporte de Servicio (tabla `reportes` del legacy, php/reportes.php).
 * Cabecera del servicio: a qué cliente, con qué documentos comerciales, y su
 * estado global. El trabajo real (equipo + técnico + patrones) va en Asignacion.
 *
 * Permisos (ver reporte.routes.js/reporte.service.js): lo crea/edita
 * admin/coordinador/ventas; finalizar/reabrir/cancelar (cambiar `status`) es
 * exclusivo de admin/coordinador. Cualquier usuario autenticado puede
 * comentar. La trazabilidad de "quién hizo qué" sale del `historial`.
 */
const STATUS = ["recepcion", "en_proceso", "terminado", "entregado", "cancelado"];

const reporteSchema = new Schema(
  {
    folio: { type: String, required: true, unique: true }, // REP-2026-0001

    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },
    contacto: { type: Schema.Types.ObjectId, ref: "Contacto" },
    cotizacion: { type: Schema.Types.ObjectId, ref: "Cotizacion" },

    ordenCompra: { type: String, trim: true },
    factura: { type: String, trim: true },
    observaciones: { type: String, trim: true },

    fechaRecepcion: { type: Date, default: Date.now },
    fechaCompromiso: Date,
    fechaEntrega: Date,

    status: { type: String, enum: STATUS, default: "recepcion" },

    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" }, // quien lo inició
    historial: [eventoSchema],

    // Bitácora de comentarios libres del reporte (distinta del historial de
    // auditoría automático) — legacy: caja "Comentarios" + botón "Agregar".
    comentarios: [
      {
        texto: { type: String, required: true },
        fecha: { type: Date, default: Date.now },
        usuario: {
          id: { type: Schema.Types.ObjectId, ref: "Usuario" },
          nombre: String,
        },
      },
    ],
  },
  { timestamps: true }
);

reporteSchema.statics.STATUS = STATUS;

module.exports = model("Reporte", reporteSchema);

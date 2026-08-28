const { Schema, model } = require("mongoose");
const { eventoSchema } = require("./_shared");

/**
 * Asignación: una línea del Reporte de Servicio = UN equipo dentro del reporte
 * (tabla `asignaciones` del legacy). Lleva el técnico, los patrones REALMENTE
 * usados (trazabilidad que el legacy no tenía), y 3 estados independientes:
 * calibración · entrega · certificado.
 *
 * Proceso mejorado: cualquiera crea la asignación. El técnico ejecutor se
 * registra automáticamente cuando alguien marca la calibración como hecha, y
 * cada transición queda en `historial` con nombre + fecha.
 */
const EST_CALIBRACION = ["pendiente", "en_proceso", "terminada"];
const EST_ENTREGA = ["pendiente", "entregado"];
const EST_CERTIFICADO = ["sin_generar", "en_revision", "autorizado", "rechazado"];

const asignacionSchema = new Schema(
  {
    reporte: { type: Schema.Types.ObjectId, ref: "Reporte", required: true, index: true },
    equipo: { type: Schema.Types.ObjectId, ref: "Equipo", required: true },

    tecnicoAsignado: { type: Schema.Types.ObjectId, ref: "Usuario" }, // a quién se asignó
    tecnicoEjecutor: { type: Schema.Types.ObjectId, ref: "Usuario" }, // quién la hizo (puede diferir)

    // Patrones realmente utilizados en ESTA calibración -> cadena de trazabilidad.
    patrones: [{ type: Schema.Types.ObjectId, ref: "Patron" }],

    // Plantilla de puntos de prueba / tolerancias usada.
    performance: { type: Schema.Types.ObjectId, ref: "Performance" },
    // Cálculo(s) de incertidumbre GUM asociados a esta calibración.
    calculosIncertidumbre: [{ type: Schema.Types.ObjectId, ref: "CalculoIncertidumbre" }],

    estados: {
      calibracion: { type: String, enum: EST_CALIBRACION, default: "pendiente" },
      entrega: { type: String, enum: EST_ENTREGA, default: "pendiente" },
      certificado: { type: String, enum: EST_CERTIFICADO, default: "sin_generar" },
    },
    motivoRechazo: String,

    fechaCalibracion: Date,
    fechaEntrega: Date,

    historial: [eventoSchema],
  },
  { timestamps: true }
);

asignacionSchema.statics.EST_CALIBRACION = EST_CALIBRACION;
asignacionSchema.statics.EST_ENTREGA = EST_ENTREGA;
asignacionSchema.statics.EST_CERTIFICADO = EST_CERTIFICADO;

module.exports = model("Asignacion", asignacionSchema);

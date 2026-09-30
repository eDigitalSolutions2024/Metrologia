const { Schema, model } = require("mongoose");

/**
 * Plantilla de PERFORMANCE (tablas `performance_master` + `performance` del
 * legacy, php/nperformance.php + php/input_form.php).
 *
 * NO es incertidumbre: es la banda de tolerancia / criterio de aceptación de
 * cada punto de prueba. Fórmula EXACTA del legacy (determinística):
 *
 *   tolerancia   = nominal·(%RDG/100) + escalaTotal·(%FS/100) + unidades
 *   minimo       = nominal − tolerancia
 *   maximo       = nominal + tolerancia
 *   minimoReal   = minimo + incertidumbre      (banda encogida = guard-band)
 *   maximoReal   = maximo − incertidumbre
 *
 * Los campos calculados se guardan ya resueltos (ver performance.service.js).
 */
const puntoSchema = new Schema(
  {
    prueba: { type: String, trim: true },
    nominal: Number,
    unidad: String,
    escalaTotal: Number,
    porcentajeRdg: Number,
    porcentajeFs: Number,
    unidades: Number, // término aditivo en unidades de la magnitud
    incertidumbre: Number, // valor de incertidumbre usado para el guard-band

    // calculados y persistidos
    minimo: Number,
    maximo: Number,
    minimoReal: Number,
    maximoReal: Number,
  },
  { _id: false }
);

const performanceSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    comentarios: { type: String, trim: true },
    imagenUrl: String,

    // Segmentación (opcional) para poder filtrar plantillas por familia de equipo.
    magnitud: { type: String, trim: true }, // "Dimensional", "Presion"...
    tipoInstrumento: { type: String, trim: true }, // "Calibrador Vernier"...

    puntos: [puntoSchema],

    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

module.exports = model("Performance", performanceSchema);

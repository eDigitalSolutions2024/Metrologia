const { Schema, model } = require("mongoose");

/**
 * Catálogo de magnitudes metrológicas y, dentro de cada una, los TIPOS de
 * instrumento (vernier, micrómetro, manómetro digital, ...). Se usa para
 * organizar las plantillas de incertidumbre (ModeloIncertidumbre) y las
 * plantillas de Performance.
 */
const tipoSchema = new Schema(
  {
    clave: { type: String, required: true, trim: true }, // "vernier"
    nombre: { type: String, required: true, trim: true }, // "Calibrador Vernier"
    descripcion: String,
    unidadSugerida: String, // "mm", "bar", "°C"...
  },
  { _id: false }
);

const magnitudSchema = new Schema(
  {
    clave: { type: String, required: true, unique: true, trim: true, lowercase: true }, // "dimensional"
    nombre: { type: String, required: true, trim: true }, // "Dimensional"
    simbolo: String, // "L", "m", "p", "T"...
    unidadSI: String, // "m", "kg", "Pa", "K"...
    descripcion: String,
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    tipos: [tipoSchema],
  },
  { timestamps: true }
);

module.exports = model("Magnitud", magnitudSchema);

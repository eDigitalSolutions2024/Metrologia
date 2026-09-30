const { Schema } = require("mongoose");

/**
 * Entrada de historial/auditoría reutilizable como subdocumento en cualquier
 * modelo (Reporte, Asignacion, Certificado, CalculoIncertidumbre...).
 * Guarda un snapshot del usuario para que el historial siga siendo legible
 * aunque la cuenta se renombre o se desactive.
 */
const eventoSchema = new Schema(
  {
    accion: { type: String, required: true },
    usuario: {
      id: { type: Schema.Types.ObjectId, ref: "Usuario" },
      usuario: String,
      nombre: String,
      rol: String,
    },
    fecha: { type: Date, default: Date.now },
    detalle: Schema.Types.Mixed,
  },
  { _id: false }
);

const CATEGORIAS_EQUIPO = [
  "Presion",
  "Fuerza",
  "Masa",
  "Flujo",
  "Peso",
  "Electrica",
  "Mecanica",
  "Dimensional",
  "Temperatura",
  "Temperatura y Humedad",
  "PH",
  "Par Torsional",
  "Volumen",
];

// Los formularios opcionales de categoría/moneda a veces mandan "" (nada
// seleccionado) en vez de omitir el campo — sin este setter, el validador de
// `enum` de Mongoose rechaza "" con un 400 confuso aunque el campo no sea
// obligatorio. Se aplica en los `enum` opcionales de Equipo y Patrón.
const vacioAUndefined = (v) => (v === "" ? undefined : v);

module.exports = { eventoSchema, CATEGORIAS_EQUIPO, vacioAUndefined };

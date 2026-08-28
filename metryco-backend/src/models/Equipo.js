const { Schema, model } = require("mongoose");
const { CATEGORIAS_EQUIPO } = require("./_shared");

/**
 * Equipo del CLIENTE que entra al laboratorio a calibrarse (tabla `equipo` del
 * legacy, php/nequipo.php). Pertenece a un cliente (`empId` en el legacy) — no
 * es equipo del laboratorio.
 */
const equipoSchema = new Schema(
  {
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },
    idInterno: { type: String, required: true, trim: true }, // código de activo del cliente / "ID Planta"

    marca: String,
    modelo: String,
    serie: String,
    descripcion: { type: String, trim: true },
    categoria: { type: String, enum: CATEGORIAS_EQUIPO },
    subtipo: String, // "DIGITAL", "ANALÓGICO", "CARÁTULA"... (campo TIPO del informe)
    accuracy: Number, // exactitud / EMP del instrumento, en `unidades`

    unidades: String,
    divisionMinima: String,
    resolucion: String,
    rango: String,
    rangoUso: String,
    rangoCalibracion: String,

    localizacion: String,
    comentarios: String,
    costo: Number,
    moneda: { type: String, enum: ["MXN", "USD"] },

    // Catálogo: patrones que normalmente se usan para calibrar este equipo.
    // (Los patrones REALMENTE usados en una calibración se guardan en Asignacion.)
    patronesSugeridos: [{ type: Schema.Types.ObjectId, ref: "Patron" }],

    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    status: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  },
  { timestamps: true }
);

// Un mismo id de planta no se repite dentro del mismo cliente.
equipoSchema.index({ cliente: 1, idInterno: 1 }, { unique: true });

module.exports = model("Equipo", equipoSchema);

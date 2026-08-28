const { Schema, model } = require("mongoose");

/**
 * PLANTILLA de presupuesto de incertidumbre (uncertainty budget) para una
 * magnitud + tipo de instrumento. Define QUÉ contribuciones se consideran
 * típicamente; los VALORES concretos los captura el técnico en cada cálculo
 * (CalculoIncertidumbre) — aquí van como sugerencia / cero.
 *
 * Método: GUM (JCGM 100:2008) + EA-4/02. Combinación por suma en cuadratura
 * (RSS) y factor de cobertura por Welch–Satterthwaite. Todo el cálculo es
 * determinístico y vive en services/incertidumbre/engine.js.
 */
const MODOS = ["semiamplitud", "desviacion_std", "incertidumbre_std", "certificado"];
const DISTRIBUCIONES = ["normal", "rectangular", "triangular", "forma_u"];

const contribucionPlantillaSchema = new Schema(
  {
    fuente: { type: String, required: true }, // "Resolución del instrumento"
    simbolo: String, // "δx_res"
    tipo: { type: String, enum: ["A", "B"], default: "B" },
    modo: { type: String, enum: MODOS, default: "semiamplitud" },
    distribucion: { type: String, enum: DISTRIBUCIONES, default: "rectangular" },

    valorSugerido: { type: Number, default: 0 },
    k: { type: Number, default: 2 }, // para modo "certificado"
    n: Number, // para modo "desviacion_std"
    divisorManual: Number,
    coefSensibilidad: { type: Number, default: 1 }, // c_i
    gradosLibertad: Number, // v_i ; vacío = infinito
    unidad: String,
    ayuda: String, // texto guía para el técnico / el asistente
    obligatoria: { type: Boolean, default: false },
  },
  { _id: false }
);

const modeloIncertidumbreSchema = new Schema(
  {
    magnitud: { type: String, required: true, trim: true, lowercase: true }, // clave: "dimensional"
    tipoInstrumento: { type: String, required: true, trim: true, lowercase: true }, // clave: "vernier"

    nombre: { type: String, required: true, trim: true },
    mensurando: String, // "Error de indicación del calibrador"
    unidad: String, // "mm"
    normaReferencia: { type: String, default: "JCGM 100:2008 (GUM); EA-4/02" },
    nivelConfianza: { type: String, default: "95.45%" },
    metodo: { type: String, default: "gum" },

    contribuciones: [contribucionPlantillaSchema],

    notas: String,
    activo: { type: Boolean, default: true },
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

modeloIncertidumbreSchema.index({ magnitud: 1, tipoInstrumento: 1 });
modeloIncertidumbreSchema.statics.MODOS = MODOS;
modeloIncertidumbreSchema.statics.DISTRIBUCIONES = DISTRIBUCIONES;

module.exports = model("ModeloIncertidumbre", modeloIncertidumbreSchema);

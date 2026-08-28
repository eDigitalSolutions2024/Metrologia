const { Schema, model } = require("mongoose");
const { eventoSchema } = require("./_shared");

/**
 * Un presupuesto de incertidumbre EJECUTADO: los valores reales que capturó el
 * técnico + el resultado calculado por el motor determinístico.
 *
 * Trazabilidad (requisito del proyecto):
 *  - quién lo creó / revisó / aprobó y cuándo  -> creadoPor + historial + *Por
 *  - qué datos usó                             -> contribuciones (snapshot)
 *  - qué versión del método                    -> motor { nombre, version }
 *  - resultado obtenido                        -> resultado
 *  - no se sobreescribe: recalcular sube `version` y archiva en versionesPrevias
 */
const ESTADOS = ["borrador", "calculado", "revisado", "aprobado", "obsoleto"];

const contribucionSchema = new Schema(
  {
    fuente: { type: String, required: true },
    simbolo: String,
    tipo: { type: String, enum: ["A", "B"], default: "B" },
    modo: { type: String, default: "semiamplitud" },
    distribucion: { type: String, default: "rectangular" },

    valor: { type: Number, default: 0 }, // a / s / u / U según `modo`
    k: { type: Number, default: 2 },
    n: Number,
    divisorManual: Number,
    coefSensibilidad: { type: Number, default: 1 },
    gradosLibertad: Number,
    unidad: String,
    notas: String,

    // calculados por el motor (persistidos para auditoría)
    divisor: Number,
    u: Number, // incertidumbre estándar u(xi)
    contribucion: Number, // c_i · u(xi)
    porcentajeVarianza: Number, // % de u_c^2
  },
  { _id: false }
);

const resultadoSchema = new Schema(
  {
    y: Number, // valor del mensurando (estimado)
    unidad: String,
    uCombinada: Number, // u_c(y)
    gradosLibertadEfectivos: Number, // v_eff (Welch–Satterthwaite)
    k: Number, // factor de cobertura
    kMetodo: String, // "t-Student 95.45% / v_eff" | "k=2"
    incertidumbreExpandida: Number, // U = k · u_c
    incertidumbreExpandidaRel: Number, // U / |y|  (si y ≠ 0)
    nivelConfianza: String,
    expresion: String, // "y ± U (k = ..., ...)"
  },
  { _id: false }
);

const calculoIncertidumbreSchema = new Schema(
  {
    folio: { type: String, unique: true, sparse: true }, // UNC-2026-0001

    modelo: { type: Schema.Types.ObjectId, ref: "ModeloIncertidumbre" },
    modeloSnapshot: { nombre: String, normaReferencia: String, nivelConfianza: String },

    magnitud: { type: String, trim: true, lowercase: true },
    tipoInstrumento: { type: String, trim: true, lowercase: true },
    mensurando: String,
    unidad: String,

    equipo: { type: Schema.Types.ObjectId, ref: "Equipo" },
    asignacion: { type: Schema.Types.ObjectId, ref: "Asignacion" },
    patronesUsados: [{ type: Schema.Types.ObjectId, ref: "Patron" }],

    // Datos de entrada
    puntoNominal: Number, // punto de calibración
    lecturas: [Number], // observaciones repetidas (opcional -> repetibilidad tipo A)
    valorMedido: Number, // y capturado (si no se deriva de lecturas)

    // Contexto de informe de calibración
    condicion: { type: String, enum: ["encontrado", "dejado", "unico"], default: "unico" },
    emp: Number, // error máximo permisible aplicado (del modelo o capturado)
    desviacionStd: Number, // s de las lecturas (columna "DESVIACION STD" del informe)
    errorIndicacion: Number, // y − puntoNominal
    criterio: { type: String, enum: ["pasa", "no_pasa", "sin_evaluar"], default: "sin_evaluar" },

    contribuciones: [contribucionSchema],
    resultado: resultadoSchema,

    motor: {
      nombre: { type: String, default: "gum-deterministico" },
      version: { type: String, default: "1.0.0" },
      calculadoEn: Date,
    },

    estado: { type: String, enum: ESTADOS, default: "borrador" },
    version: { type: Number, default: 1 },
    versionesPrevias: [
      {
        version: Number,
        contribuciones: [contribucionSchema],
        resultado: resultadoSchema,
        fecha: Date,
        por: { id: { type: Schema.Types.ObjectId, ref: "Usuario" }, nombre: String },
        _id: false,
      },
    ],

    revisadoPor: { id: { type: Schema.Types.ObjectId, ref: "Usuario" }, nombre: String, fecha: Date },
    aprobadoPor: { id: { type: Schema.Types.ObjectId, ref: "Usuario" }, nombre: String, fecha: Date },

    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    historial: [eventoSchema],
  },
  { timestamps: true }
);

calculoIncertidumbreSchema.statics.ESTADOS = ESTADOS;

module.exports = model("CalculoIncertidumbre", calculoIncertidumbreSchema);

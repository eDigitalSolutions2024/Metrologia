const { Schema, model } = require("mongoose");
const { CATEGORIAS_EQUIPO, eventoSchema, vacioAUndefined } = require("./_shared");

/**
 * Patrón de referencia del laboratorio (tabla `patrones` del legacy).
 *
 * Rediseñado para alimentar el motor de incertidumbre:
 *  - `incertidumbre`: estructurada. Modo "fija" (un valor) o "tabla" (por punto).
 *    Es la U del CERTIFICADO del patrón, con su k. u = U / k.
 *  - `deriva`: cambio máximo entre calibraciones -> contribución rectangular.
 *  - `calibracion`: certificado + periodicidad + vencimiento (auto).
 */
const MODOS_INCERT = ["fija", "tabla"];
const ESTADOS = ["activo", "en_calibracion", "baja"];

const puntoUSchema = new Schema(
  { nominal: Number, U: Number },
  { _id: false }
);

const patronSchema = new Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true, uppercase: true }, // PAT-001
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    categoria: { type: String, enum: CATEGORIAS_EQUIPO, set: vacioAUndefined },
    magnitud: { type: String, trim: true, lowercase: true }, // clave del catálogo Magnitud

    marca: String,
    modelo: String,
    serie: String,

    // --- Metrología ---
    unidad: String, // "mm", "bar", "°C"...
    intervaloMedicion: String, // rango, ej. "0–100 mm"
    resolucion: String,
    comentarios: String,

    // --- Incertidumbre del certificado del patrón ---
    incertidumbre: {
      modo: { type: String, enum: MODOS_INCERT, default: "fija" },
      k: { type: Number, default: 2 },
      unidad: String, // si difiere de `unidad`
      valor: Number, // modo "fija": U del certificado
      puntos: [puntoUSchema], // modo "tabla": {nominal, U} ordenados
    },

    // --- Deriva (opcional) ---
    deriva: {
      valor: Number, // cambio máx. observado
      unidad: String,
      periodoMeses: Number, // en cuánto tiempo (ej. 12)
    },

    // --- Trazabilidad y calibración ---
    trazabilidad: { type: String, trim: true }, // "CENAM", "NIST vía Fluke", ...
    calibracion: {
      laboratorio: String, // quién calibró el patrón
      numeroCertificado: String,
      fecha: Date,
      periodicidadMeses: { type: Number, default: 12 },
      vencimiento: { type: Date, index: true }, // auto = fecha + periodicidad
      archivo: {
        nombreArchivo: String,
        nombreOriginal: String,
        mimetype: String,
        tamano: Number,
        subidoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
        fecha: Date,
      },
    },

    // --- Operación ---
    condicionesReferencia: String, // "20 ± 1 °C, 45–55 % HR"
    manejo: String,
    procedimiento: String,
    transporte: String,
    almacenamiento: String,

    estado: { type: String, enum: ESTADOS, default: "activo" },
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    historial: [eventoSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patronSchema.statics.MODOS_INCERT = MODOS_INCERT;
patronSchema.statics.ESTADOS = ESTADOS;

/** U (y su k) del patrón en un punto nominal — fija o interpolada de la tabla. */
patronSchema.methods.uEn = function (nominal) {
  const k = this.incertidumbre?.k || 2;
  const unidad = this.incertidumbre?.unidad || this.unidad;
  if (this.incertidumbre?.modo === "tabla" && this.incertidumbre.puntos?.length) {
    const pts = [...this.incertidumbre.puntos]
      .filter((p) => Number.isFinite(p.nominal) && Number.isFinite(p.U))
      .sort((a, b) => a.nominal - b.nominal);
    if (!pts.length) return { U: undefined, k, unidad };
    const n = Number(nominal);
    if (!Number.isFinite(n)) return { U: pts[pts.length - 1].U, k, unidad }; // sin punto: el mayor
    if (n <= pts[0].nominal) return { U: pts[0].U, k, unidad };
    if (n >= pts[pts.length - 1].nominal) return { U: pts[pts.length - 1].U, k, unidad };
    for (let i = 0; i < pts.length - 1; i++) {
      if (n >= pts[i].nominal && n <= pts[i + 1].nominal) {
        const t = (n - pts[i].nominal) / (pts[i + 1].nominal - pts[i].nominal);
        return { U: pts[i].U + t * (pts[i + 1].U - pts[i].U), k, unidad };
      }
    }
  }
  return { U: this.incertidumbre?.valor, k, unidad };
};

/** "vigente" | "por_vencer" (≤ 30 d) | "vencido" | "sin_fecha" respecto a `ref`. */
patronSchema.methods.estadoVigencia = function (ref = new Date()) {
  const v = this.calibracion?.vencimiento;
  if (!v) return "sin_fecha";
  const dias = Math.ceil((new Date(v) - new Date(ref)) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "por_vencer";
  return "vigente";
};

patronSchema.virtual("vigencia").get(function () {
  return this.estadoVigencia();
});
patronSchema.virtual("diasParaVencer").get(function () {
  const v = this.calibracion?.vencimiento;
  return v ? Math.ceil((new Date(v) - new Date()) / 86400000) : null;
});

module.exports = model("Patron", patronSchema);

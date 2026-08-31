const { Schema, model } = require("mongoose");
const { CATEGORIAS_EQUIPO, vacioAUndefined } = require("./_shared");

/**
 * Patrón de referencia propiedad del laboratorio (tabla `patrones` del legacy,
 * php/npatron.php). Mejora sobre el legacy: la incertidumbre deja de ser texto
 * libre y se guarda estructurada (valor + unidad + k).
 */
const patronSchema = new Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true }, // PAT-001
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    categoria: { type: String, enum: CATEGORIAS_EQUIPO, set: vacioAUndefined },
    marca: String,
    modelo: String,
    serie: String,

    trazabilidad: { type: String, trim: true }, // CENAM, NIM, NIST, ...
    comentarios: String,
    unidades: String,
    capacidad: String, // rango, ej. "0–100 mm"
    divisionMinima: String,

    // Incertidumbre del patrón, estructurada (antes era un string).
    incertidumbre: {
      valor: Number,
      unidad: String,
      k: { type: Number, default: 2 },
    },

    ultimaCalibracion: {
      fecha: Date,
      vencimiento: { type: Date, index: true },
      certificadoNo: String,
      laboratorio: String, // quién calibró el patrón
      archivoUrl: String, // certificado PDF del patrón
    },

    // Instrucciones operativas (4 secciones del PHP)
    manejo: String,
    procedimiento: String,
    transporte: String,
    almacenamiento: String,

    activo: { type: Boolean, default: true },
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

patronSchema.virtual("vigente").get(function () {
  const v = this.ultimaCalibracion?.vencimiento;
  return v ? new Date(v) > new Date() : null;
});

patronSchema.set("toJSON", { virtuals: true });

module.exports = model("Patron", patronSchema);

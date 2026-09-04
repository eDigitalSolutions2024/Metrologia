const { Schema, model } = require("mongoose");

const itemSchema = new Schema(
  {
    descripcion: { type: String, required: true, trim: true },
    cantidad: { type: Number, required: true, min: 0 },
    precioUnitario: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const STATUS = ["pendiente", "aprobada", "rechazada", "facturada", "vencida"];
const MONEDAS = ["MXN", "USD"];

const adjuntoSchema = new Schema(
  {
    nombreArchivo: String, // nombre en disco
    nombreOriginal: String,
    mimetype: String,
    tamano: Number,
    subidoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    fecha: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cotizacionSchema = new Schema(
  {
    folio: { type: String, required: true, unique: true },
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    contacto: { type: Schema.Types.ObjectId, ref: "Contacto" },
    razonSocial: { type: Schema.Types.ObjectId, ref: "RazonSocial" },
    fecha: { type: Date, default: Date.now },
    vigencia: { type: Date, required: true },
    items: {
      type: [itemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "La cotización debe tener al menos una partida",
      },
    },
    moneda: { type: String, enum: MONEDAS, default: "MXN" },
    ivaPorcentaje: { type: Number, default: 16, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
    iva: { type: Number, required: true },
    total: { type: Number, required: true },
    observaciones: { type: String, trim: true },
    status: { type: String, enum: STATUS, default: "pendiente" },
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
    adjuntos: [adjuntoSchema],
  },
  { timestamps: true }
);

cotizacionSchema.statics.MONEDAS = MONEDAS;

cotizacionSchema.statics.STATUS = STATUS;

module.exports = model("Cotizacion", cotizacionSchema);

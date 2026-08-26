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

const cotizacionSchema = new Schema(
  {
    folio: { type: String, required: true, unique: true },
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    fecha: { type: Date, default: Date.now },
    vigencia: { type: Date, required: true },
    items: {
      type: [itemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "La cotización debe tener al menos una partida",
      },
    },
    subtotal: { type: Number, required: true },
    iva: { type: Number, required: true },
    total: { type: Number, required: true },
    observaciones: { type: String, trim: true },
    status: { type: String, enum: STATUS, default: "pendiente" },
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

cotizacionSchema.statics.STATUS = STATUS;

module.exports = model("Cotizacion", cotizacionSchema);

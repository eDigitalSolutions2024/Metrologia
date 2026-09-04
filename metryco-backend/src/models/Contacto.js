const { Schema, model } = require("mongoose");

const contactoSchema = new Schema(
  {
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, trim: true },
    correo: { type: String, trim: true }, // correo general (compatibilidad)
    emailCotizaciones: { type: String, trim: true },
    emailFacturacion: { type: String, trim: true },
    status: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  },
  { timestamps: true }
);

contactoSchema.index({ cliente: 1 });

module.exports = model("Contacto", contactoSchema);

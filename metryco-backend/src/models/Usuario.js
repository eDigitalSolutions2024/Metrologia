const { Schema, model } = require("mongoose");

const ROLES = ["admin", "tecnico", "ventas", "coordinador"];
const SUCURSALES = ["juarez", "chihuahua", "admin"];

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    usuario: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: ROLES, required: true },
    sucursal: { type: String, enum: SUCURSALES },
    firmaUrl: { type: String },
    fotoUrl: { type: String },
    avatarColor: { type: String }, // preset de color para el avatar cuando no hay foto subida
    status: { type: String, enum: ["activo", "inactivo"], default: "activo" },
    observaciones: [
      {
        texto: { type: String, required: true, trim: true },
        autor: { type: String, required: true },
        fecha: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

usuarioSchema.statics.ROLES = ROLES;
usuarioSchema.statics.SUCURSALES = SUCURSALES;

module.exports = model("Usuario", usuarioSchema);

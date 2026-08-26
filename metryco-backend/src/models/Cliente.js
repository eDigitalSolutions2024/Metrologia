const { Schema, model } = require("mongoose");

const domicilioSchema = new Schema(
  {
    calle: String,
    numExterior: String,
    numInterior: String,
    colonia: String,
    municipio: String,
    ciudad: String,
    estado: String,
    pais: String,
    cp: String,
  },
  { _id: false }
);

const contactoSchema = new Schema(
  {
    nombre: String,
    telefono: String,
    emailCotizaciones: String,
    emailFacturacion: String,
  },
  { _id: false }
);

const USO_CFDI = ["G01", "G02", "G03", "I01", "I04", "P01"];
const FORMA_PAGO = ["01", "02", "03", "28", "29", "99"];
const METODO_PAGO = ["PUE", "PPD"];
const SUCURSALES = ["juarez", "chihuahua"];
const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const facturacionSchema = new Schema(
  {
    formaPago: { type: String, enum: FORMA_PAGO },
    metodoPago: { type: String, enum: METODO_PAGO },
    numCuenta: String,
  },
  { _id: false }
);

const clienteSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true }, // razón social
    nombreComercial: { type: String, trim: true },
    rfc: { type: String, required: true, trim: true, uppercase: true, unique: true },
    regimenFiscal: String,
    usoCFDI: { type: String, enum: USO_CFDI },
    domicilioFiscal: domicilioSchema,
    contacto: contactoSchema,
    facturacion: facturacionSchema,
    passwordHash: { type: String, select: false },
    sucursal: { type: String, enum: SUCURSALES },
    sector: String,
    diasContraRecibo: [{ type: String, enum: DIAS_SEMANA }],
    status: { type: String, enum: ["activo", "inactivo"], default: "activo" },
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

clienteSchema.statics.USO_CFDI = USO_CFDI;
clienteSchema.statics.FORMA_PAGO = FORMA_PAGO;
clienteSchema.statics.METODO_PAGO = METODO_PAGO;
clienteSchema.statics.SUCURSALES = SUCURSALES;
clienteSchema.statics.DIAS_SEMANA = DIAS_SEMANA;

module.exports = model("Cliente", clienteSchema);

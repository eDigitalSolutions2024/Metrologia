const { z } = require("zod");
const { passwordSchema } = require("./password.schema");

const USO_CFDI = ["G01", "G02", "G03", "I01", "I04", "P01"];
const FORMA_PAGO = ["01", "02", "03", "28", "29", "99"];
const METODO_PAGO = ["PUE", "PPD"];
const SUCURSALES = ["juarez", "chihuahua"];
const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

// Mismo criterio que Equipo/Patrón: "" (nada seleccionado) no debe tratarse
// como un valor de enum inválido, sino como "no mandado".
const vacio = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const domicilioSchema = z.object({
  calle: z.string().trim().optional(),
  numExterior: z.string().trim().optional(),
  numInterior: z.string().trim().optional(),
  colonia: z.string().trim().optional(),
  municipio: z.string().trim().optional(),
  ciudad: z.string().trim().optional(),
  estado: z.string().trim().optional(),
  pais: z.string().trim().optional(),
  cp: z.string().trim().optional(),
}).partial().optional();

const contactoSchema = z.object({
  nombre: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  emailCotizaciones: z.string().trim().optional(),
  emailFacturacion: z.string().trim().optional(),
}).partial().optional();

const facturacionSchema = z.object({
  formaPago: vacio(z.enum(FORMA_PAGO, { error: "Forma de pago inválida" })),
  metodoPago: vacio(z.enum(METODO_PAGO, { error: "Método de pago inválido" })),
  numCuenta: z.string().trim().optional(),
}).partial().optional();

const baseCliente = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  nombreComercial: z.string().trim().optional(),
  rfc: z.string().trim().min(1, "El RFC es obligatorio"),
  regimenFiscal: z.string().trim().optional(),
  usoCFDI: vacio(z.enum(USO_CFDI, { error: "Uso de CFDI inválido" })),
  domicilioFiscal: domicilioSchema,
  contacto: contactoSchema,
  facturacion: facturacionSchema,
  password: passwordSchema.optional(),
  sucursal: vacio(z.enum(SUCURSALES, { error: "Sucursal inválida" })),
  sector: z.string().trim().optional(),
  diasContraRecibo: z.array(z.enum(DIAS_SEMANA)).optional(),
  status: z.enum(["activo", "inactivo"]).optional(),
};

const crearClienteSchema = z.object(baseCliente);
const actualizarClienteSchema = z.object({ ...baseCliente, nombre: baseCliente.nombre.optional(), rfc: baseCliente.rfc.optional() });

module.exports = { crearClienteSchema, actualizarClienteSchema };

const { z } = require("zod");
const { CATEGORIAS_EQUIPO } = require("../models/_shared");
const { objectId } = require("./common.schema");

// "" (nada seleccionado) se trata como "no mandado" en vez de un valor de
// enum inválido — mismo criterio que el setter `vacioAUndefined` del schema
// de Mongoose, aplicado ahora un paso antes, en la validación de entrada.
const categoriaOpcional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(CATEGORIAS_EQUIPO, { error: "Categoría inválida" }).optional()
);
const monedaOpcional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(["MXN", "USD"], { error: "Moneda inválida" }).optional()
);

const baseEquipo = {
  idInterno: z.string().trim().min(1, "El ID interno es obligatorio"),
  cliente: objectId,
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  serie: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  categoria: categoriaOpcional,
  subtipo: z.string().trim().optional(),
  accuracy: z.coerce.number().optional(),
  unidades: z.string().trim().optional(),
  divisionMinima: z.string().trim().optional(),
  resolucion: z.string().trim().optional(),
  rango: z.string().trim().optional(),
  rangoUso: z.string().trim().optional(),
  rangoCalibracion: z.string().trim().optional(),
  localizacion: z.string().trim().optional(),
  comentarios: z.string().trim().optional(),
  costo: z.coerce.number().min(0).optional(),
  moneda: monedaOpcional,
  patronesSugeridos: z.array(objectId).optional(),
  status: z.enum(["activo", "inactivo"]).optional(),
};

const crearEquipoSchema = z.object(baseEquipo);
const actualizarEquipoSchema = z.object({ ...baseEquipo, idInterno: baseEquipo.idInterno.optional(), cliente: objectId.optional() });

module.exports = { crearEquipoSchema, actualizarEquipoSchema };

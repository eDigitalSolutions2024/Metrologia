const bcrypt = require("bcryptjs");
const Cliente = require("../models/Cliente");
const Contacto = require("../models/Contacto");
const Cotizacion = require("../models/Cotizacion");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");

async function listar({ search = "", sector = "", page = 0, pageSize = 10 }) {
  const filtro = {};

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filtro.$or = [
      { nombre: regex },
      { rfc: regex },
      { "contacto.nombre": regex },
    ];
  }

  if (sector && sector !== "todos") {
    filtro.sector = sector;
  }

  const [items, total] = await Promise.all([
    Cliente.find(filtro)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Cliente.countDocuments(filtro),
  ]);

  return { items, total };
}

async function obtener(id) {
  const cliente = await Cliente.findById(id);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);
  return cliente;
}

// El "Contacto Principal" del alta/edición vive embebido en Cliente.contacto,
// pero los selects de Cotización/Reporte solo leen la colección Contacto
// (son los que se pueden referenciar por ObjectId). Sin esto, el contacto
// capturado al dar de alta el cliente nunca aparecía en esos desplegables.
async function sincronizarContactoPrincipal(clienteId, contacto) {
  if (!contacto?.nombre?.trim()) return;
  await Contacto.findOneAndUpdate(
    { cliente: clienteId, esPrincipal: true },
    {
      cliente: clienteId,
      esPrincipal: true,
      nombre: contacto.nombre.trim(),
      telefono: contacto.telefono || "",
      correo: contacto.correo || "",
      status: "activo",
    },
    { upsert: true }
  );
}

async function crear(datos) {
  const { password, ...resto } = datos;
  if (!password || password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const cliente = await Cliente.create({ ...resto, passwordHash });
  await sincronizarContactoPrincipal(cliente._id, resto.contacto);
  return cliente;
}

async function actualizar(id, datos) {
  const { password, ...resto } = datos;
  const cambios = { ...resto };

  if (password) {
    if (password.length < 8) {
      throw new AppError("La contraseña debe tener al menos 8 caracteres", 400);
    }
    cambios.passwordHash = await bcrypt.hash(password, 10);
  }

  const cliente = await Cliente.findByIdAndUpdate(id, cambios, {
    new: true,
    runValidators: true,
  });
  if (!cliente) throw new AppError("Cliente no encontrado", 404);

  if (datos.contacto !== undefined) {
    await sincronizarContactoPrincipal(id, datos.contacto);
  }

  return cliente;
}

async function eliminar(id) {
  const tieneCotizaciones = await Cotizacion.exists({ cliente: id });
  if (tieneCotizaciones) {
    throw new AppError(
      "No se puede eliminar: el cliente tiene cotizaciones registradas. Márcalo como inactivo en su lugar.",
      409
    );
  }

  const cliente = await Cliente.findByIdAndDelete(id);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);

  await Contacto.deleteMany({ cliente: id });
  return cliente;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };

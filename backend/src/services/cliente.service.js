const bcrypt = require("bcryptjs");
const Cliente = require("../models/Cliente");
const Contacto = require("../models/Contacto");
const Cotizacion = require("../models/Cotizacion");
const Reporte = require("../models/Reporte");
const Equipo = require("../models/Equipo");
const Certificado = require("../models/Certificado");
const ComprobanteFiscal = require("../models/ComprobanteFiscal");
const Factura = require("../models/Factura");
const { cobradoDe, saldoDe } = require("../utils/saldoFactura");
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

/**
 * Ficha del cliente: su historial en todos los módulos en una sola consulta
 * (últimos registros + totales), para no tener que buscarlo módulo por módulo.
 */
async function resumen(id) {
  const cliente = await obtener(id);
  const c = cliente._id;
  const ahora = new Date();
  const suma = (arr) => arr.reduce((s, r) => s + (r.total || 0), 0);

  const [cotizaciones, reportes, equipos, certificados, cfdis, cuentas] = await Promise.all([
    Cotizacion.find({ cliente: c }).sort({ fecha: -1 }).select("folio fecha total status moneda").lean(),
    Reporte.find({ cliente: c }).sort({ createdAt: -1 }).select("folio status createdAt").lean(),
    Equipo.countDocuments({ cliente: c, status: "activo" }),
    Certificado.find({ cliente: c }).sort({ createdAt: -1 }).select("folio estado vigencia").lean(),
    ComprobanteFiscal.find({ cliente: c }).sort({ createdAt: -1 })
      .select("folioInterno total estado tipoComprobante metodoPago saldoPendiente createdAt").lean(),
    Factura.find({ cliente: c }).select("monto statusPago fechaPago abonos").lean(),
  ]);

  const enDias = new Date(ahora.getTime() + 30 * 24 * 3600 * 1000);
  const pendientes = cuentas.filter((f) => f.statusPago === 0);
  return {
    cliente,
    cotizaciones: {
      total: cotizaciones.length,
      aprobado: suma(cotizaciones.filter((q) => ["aprobada", "facturada"].includes(q.status))),
      ultimas: cotizaciones.slice(0, 5),
    },
    reportes: { total: reportes.length, abiertos: reportes.filter((r) => ["recepcion", "en_proceso"].includes(r.status)).length, ultimos: reportes.slice(0, 5) },
    equipos: { activos: equipos },
    certificados: {
      total: certificados.length,
      vigentes: certificados.filter((x) => x.estado === "vigente").length,
      porVencer: certificados.filter((x) => x.estado === "vigente" && x.vigencia && x.vigencia > ahora && x.vigencia <= enDias).length,
      ultimos: certificados.slice(0, 5),
    },
    cfdi: {
      total: cfdis.length,
      saldoPendiente: cfdis.filter((f) => f.estado === "timbrada" && f.tipoComprobante === "I" && f.metodoPago === "PPD")
        .reduce((s, f) => s + (f.saldoPendiente || 0), 0),
      ultimos: cfdis.slice(0, 5),
    },
    cobranza: {
      atrasado: pendientes.filter((f) => f.fechaPago < ahora).reduce((s, f) => s + saldoDe(f), 0),
      porPagar: pendientes.filter((f) => f.fechaPago >= ahora).reduce((s, f) => s + saldoDe(f), 0),
      cobrado: cuentas.reduce((s, f) => s + cobradoDe(f), 0),
    },
  };
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

module.exports = { listar, obtener, resumen, crear, actualizar, eliminar };

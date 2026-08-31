const Cotizacion = require("../models/Cotizacion");
const Factura = require("../models/Factura");
const patronService = require("./patron.service");
const certificadoService = require("./certificado.service");
const asignacionService = require("./asignacion.service");

const DIAS_SIN_SEGUIMIENTO = 3; // pendiente sin moverse en X días
const DIAS_RECIENTE = 7; // ventana para "recién rechazada/aprobada"
const DIAS_POR_VENCER = 30;

function fmt(fecha) {
  return fecha ? new Date(fecha).toLocaleDateString("es-MX") : "";
}

function diasDesde(fecha) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

function diasHasta(fecha) {
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function grupo(clave, titulo, icono, severidad, ruta, items, mapear) {
  return { clave, titulo, icono, severidad, ruta, total: items.length, items: items.slice(0, 5).map(mapear) };
}

async function cotizacionesPorEstado(status, campoFecha, dias, orden) {
  const limite = new Date(Date.now() - dias * 86400000);
  const filtroFecha = orden === "antiguas" ? { $lte: limite } : { $gte: limite };
  return Cotizacion.find({ status, [campoFecha]: filtroFecha })
    .populate("cliente", "nombre")
    .sort({ [campoFecha]: orden === "antiguas" ? 1 : -1 })
    .limit(20)
    .lean();
}

/**
 * Alertas pendientes por rol para el popup flotante del Navbar. Solo incluye
 * datos reales (nada de Cobranza/Facturación todavía — ese módulo sigue sin
 * backend, ver memoria del proyecto). admin/coordinador ven todo combinado;
 * ventas ve solo lo comercial; técnico ve solo lo suyo + patrones.
 *
 * Cada item trae `ruta` propia cuando existe una pantalla de detalle clara
 * (el popup navega directo a ese registro, no solo a la lista general).
 */
async function obtener(reqUser) {
  const rol = reqUser?.rol;
  const esAdminCoord = rol === "admin" || rol === "coordinador";
  const esVentas = rol === "ventas";
  const esTecnico = rol === "tecnico";
  const grupos = [];

  if (esAdminCoord || esVentas) {
    const sinSeguimiento = await cotizacionesPorEstado("pendiente", "createdAt", DIAS_SIN_SEGUIMIENTO, "antiguas");
    grupos.push(grupo(
      "cotizaciones_sin_seguimiento", "Cotizaciones sin seguimiento", "solicitud", "warning", "/cotizaciones",
      sinSeguimiento,
      (c) => ({
        id: c._id, ruta: `/cotizaciones?editar=${c._id}`,
        texto: `${c.folio} — ${c.cliente?.nombre || "Cliente"}`, detalle: `hace ${diasDesde(c.createdAt)} días`,
      })
    ));

    const rechazadas = await cotizacionesPorEstado("rechazada", "updatedAt", DIAS_RECIENTE, "recientes");
    grupos.push(grupo(
      "cotizaciones_rechazadas", "Cotizaciones rechazadas recientes", "rechazo", "error", "/cotizaciones",
      rechazadas,
      (c) => ({
        id: c._id, ruta: `/cotizaciones?editar=${c._id}`,
        texto: `${c.folio} — ${c.cliente?.nombre || "Cliente"}`, detalle: `hace ${diasDesde(c.updatedAt)} días`,
      })
    ));

    const aprobadas = await cotizacionesPorEstado("aprobada", "updatedAt", DIAS_RECIENTE, "recientes");
    grupos.push(grupo(
      "cotizaciones_aprobadas", "Cotizaciones aprobadas por facturar", "aprobado", "success", "/cotizaciones",
      aprobadas,
      (c) => ({
        id: c._id, ruta: `/cotizaciones?editar=${c._id}`,
        texto: `${c.folio} — ${c.cliente?.nombre || "Cliente"}`, detalle: `hace ${diasDesde(c.updatedAt)} días`,
      })
    ));
  }

  if (esVentas) {
    // Certificados por vencer = clientes candidatos a una nueva cotización de calibración.
    const certificados = await certificadoService.porVencer(DIAS_POR_VENCER);
    grupos.push(grupo(
      "equipos_por_vencer_ventas", "Certificados por vencer — oportunidad de recotizar", "certificado", "warning", "/reportes/certificados",
      certificados,
      (c) => ({ id: c._id, texto: `${c.folio} — ${c.cliente?.nombre || "Cliente"}`, detalle: `vence en ${diasHasta(c.vigencia)} días` })
    ));
  }

  if (esAdminCoord || esTecnico) {
    const patrones = await patronService.porVencer(DIAS_POR_VENCER);
    grupos.push(grupo(
      "patrones_por_vencer", "Patrones por vencer", "patron", "warning", "/equipos/patrones",
      patrones,
      (p) => ({
        id: p._id, ruta: `/equipos/patrones/${p._id}/editar`,
        texto: `${p.codigo} — ${p.descripcion || p.nombre}`, detalle: `vence en ${diasHasta(p.ultimaCalibracion?.vencimiento)} días`,
      })
    ));

    const certificados = await certificadoService.porVencer(DIAS_POR_VENCER);
    grupos.push(grupo(
      "certificados_por_vencer", "Certificados por vencer", "certificado", "warning", "/reportes/certificados",
      certificados,
      (c) => ({ id: c._id, texto: `${c.folio} — ${c.cliente?.nombre || "Cliente"}`, detalle: `vence en ${diasHasta(c.vigencia)} días` })
    ));
  }

  if (esAdminCoord) {
    const facturasAtrasadas = await Factura.find({ statusPago: 0, fechaPago: { $lt: new Date() } })
      .populate("cliente", "nombre")
      .sort({ fechaPago: 1 })
      .lean();
    grupos.push(grupo(
      "facturas_atrasadas", "Facturas atrasadas por cobrar", "factura", "error", "/cobranza",
      facturasAtrasadas,
      (f) => ({ id: f._id, texto: `${f.folio} — ${f.cliente?.nombre || "Cliente"}`, detalle: `${diasDesde(f.fechaPago)} días de atraso` })
    ));

    const calidad = await asignacionService.listarParaCalidad({});
    grupos.push(grupo(
      "calidad_pendiente", "Calidad: certificados por revisar", "calidad", "info", "/calidad",
      calidad,
      (a) => ({
        id: a._id, ruta: a.reporte?._id ? `/reportes/${a.reporte._id}` : undefined,
        texto: `${a.reporte?.folio || "—"} — ${a.equipo?.idInterno || "—"}`, detalle: a.reporte?.cliente?.nombre || "",
      })
    ));
  }

  if (esTecnico) {
    const { items: mias } = await asignacionService.listar({
      tecnicoAsignado: reqUser.id, estadoCalibracion: "pendiente", pageSize: 50,
    });
    grupos.push(grupo(
      "mis_asignaciones_pendientes", "Mis asignaciones pendientes", "asignacion", "primary", "/reportes/mis-asignaciones",
      mias,
      (a) => ({
        id: a._id, ruta: a.reporte?._id ? `/reportes/${a.reporte._id}` : undefined,
        texto: `${a.reporte?.folio || "—"} — ${a.equipo?.idInterno || "—"}`, detalle: a.reporte?.cliente?.nombre || "",
      })
    ));
  }

  return grupos.filter((g) => g.total > 0);
}

module.exports = { obtener };

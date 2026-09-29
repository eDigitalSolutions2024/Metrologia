const mongoose = require("mongoose");
const ComprobanteFiscal = require("../models/ComprobanteFiscal");
const Cliente = require("../models/Cliente");
const Factura = require("../models/Factura");
const Cotizacion = require("../models/Cotizacion");
const Reporte = require("../models/Reporte");
const AppError = require("../utils/AppError");
const { siguienteFolio } = require("../utils/folio");
const configuracionService = require("./configuracion.service");
// Referencia al módulo completo (no destructurada) para que las pruebas de
// integración puedan sustituir `pacFactory.obtenerPac` por un PAC falso sin
// tocar este archivo — ver scripts de prueba en docs/FACTURACION.md §9.
const pacFactory = require("./pac/pacFactory");
const PacError = require("./pac/PacError");
const cfdiBuilder = require("./cfdiBuilder");
const { generarPdfCfdi } = require("./cfdiPdf");

const RETRY_DELAY_MS = 800;

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);
const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const ESTADOS_EDITABLES = ["borrador", "error_timbrado"];
const ESTADOS_TIMBRABLES = ["borrador", "pendiente_timbrar", "error_timbrado"];

// Regla del SAT (vigente desde 2022): cancelar un CFDI de más de $5,000 MXN
// exige que el RECEPTOR acepte o rechace la solicitud (72 horas; si no
// responde, se considera aceptada). No modela TODAS las excepciones del SAT
// (p. ej. CFDI de nómina, cancelación el mismo día de emisión, RFC genérico
// de público en general) — solo el umbral general, que es el caso normal
// para un laboratorio facturando a clientes identificados.
const UMBRAL_ACEPTACION_CANCELACION = 5000;
const HORAS_LIMITE_ACEPTACION_CANCELACION = 72;

/**
 * Recalcula subtotal/impuestos/total SIEMPRE en el backend a partir de
 * `conceptos` — nunca se confía en totales que mande el frontend (podrían
 * venir manipulados o simplemente desincronizados de un cálculo en el
 * cliente con otro redondeo).
 */
function calcularTotales(conceptos) {
  let subtotal = 0;
  let totalImpuestosTrasladados = 0;
  let totalImpuestosRetenidos = 0;
  let descuento = 0;

  const conceptosCalculados = conceptos.map((c) => {
    const importeBruto = redondear(Number(c.cantidad) * Number(c.valorUnitario));
    const desc = redondear(Number(c.descuento) || 0);
    const importe = redondear(importeBruto - desc);
    subtotal += importe;
    descuento += desc;

    // "01" (No objeto de impuesto) NUNCA debe llevar impuestos por definición
    // del catálogo SAT c_ObjetoImp — si el request trae `impuestos` de
    // cualquier forma (a mano, vía API directa, un bug del frontend), se
    // ignoran aquí en vez de cobrarlos por error. Solo "02"/"03" los aplican.
    const impuestosCalculados = c.objetoImpuesto === "01"
      ? []
      : (c.impuestos || []).map((imp) => {
          const base = redondear(importe);
          const importeImp = redondear(base * Number(imp.tasaOCuota));
          if (imp.tipo === "traslado") totalImpuestosTrasladados += importeImp;
          else totalImpuestosRetenidos += importeImp;
          return { ...imp, base, importe: importeImp };
        });

    return { ...c, importe, descuento: desc, impuestos: impuestosCalculados };
  });

  subtotal = redondear(subtotal);
  totalImpuestosTrasladados = redondear(totalImpuestosTrasladados);
  totalImpuestosRetenidos = redondear(totalImpuestosRetenidos);
  descuento = redondear(descuento);
  const total = redondear(subtotal + totalImpuestosTrasladados - totalImpuestosRetenidos);

  return { conceptos: conceptosCalculados, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total };
}

/**
 * Datos fiscales del emisor (laboratorio). Si régimen fiscal o CP fiscal no
 * están configurados en Administración, NO se puede generar ni un borrador
 * válido de CFDI — se avisa exactamente qué falta en vez de dejarlo vacío
 * (un CFDI real sin esos datos lo rechazaría el PAC de todas formas).
 */
async function obtenerEmisorFiscal() {
  const lab = await configuracionService.obtenerLaboratorio();
  const faltantes = [];
  if (!lab.rfc) faltantes.push("RFC del laboratorio");
  if (!lab.regimenFiscal) faltantes.push("Régimen fiscal del laboratorio");
  if (!lab.codigoPostalFiscal) faltantes.push("Código postal fiscal (lugar de expedición)");
  if (faltantes.length) {
    throw new AppError(
      `Faltan datos fiscales del emisor en Administración → Datos del Laboratorio: ${faltantes.join(", ")}`,
      409
    );
  }
  return { rfc: lab.rfc, nombre: lab.nombre, regimenFiscal: lab.regimenFiscal, codigoPostalFiscal: lab.codigoPostalFiscal, serieCFDI: lab.serieCFDI };
}

async function obtenerReceptorFiscal(clienteId) {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);
  const faltantes = [];
  if (!cliente.rfc) faltantes.push("RFC");
  if (!cliente.regimenFiscal) faltantes.push("Régimen fiscal");
  if (!cliente.usoCFDI) faltantes.push("Uso de CFDI");
  if (!cliente.domicilioFiscal?.cp) faltantes.push("Código postal fiscal");
  if (faltantes.length) {
    throw new AppError(
      `Faltan datos fiscales del cliente "${cliente.nombre}" para generar el CFDI: ${faltantes.join(", ")}`,
      409
    );
  }
  return {
    rfc: cliente.rfc,
    nombre: cliente.nombre,
    codigoPostal: cliente.domicilioFiscal.cp,
    regimenFiscal: cliente.regimenFiscal,
    usoCFDI: cliente.usoCFDI,
  };
}

// tipoPago: "pue" (una exhibición), "ppd" (parcialidades) o "complemento"
// (Complemento de Pago, tipo "P") — los complementos van aparte porque su
// propio metodoPago siempre es PUE y no representan una venta.
const FILTROS_TIPO_PAGO = {
  pue: { tipoComprobante: "I", metodoPago: "PUE" },
  ppd: { tipoComprobante: "I", metodoPago: "PPD" },
  complemento: { tipoComprobante: "P" },
};

async function listar({ clienteId = "", estado = "", tipoPago = "", search = "", page = 0, pageSize = 20 } = {}) {
  const match = {};
  if (clienteId && oid(clienteId)) match.cliente = oid(clienteId);
  if (estado) match.estado = estado;
  if (FILTROS_TIPO_PAGO[tipoPago]) Object.assign(match, FILTROS_TIPO_PAGO[tipoPago]);
  const q = String(search).trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ folioInterno: rx }, { uuid: rx }, { "receptor.rfc": rx }, { "receptor.nombre": rx }];
  }

  const [items, total] = await Promise.all([
    ComprobanteFiscal.find(match)
      .populate("cliente", "nombre rfc")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    ComprobanteFiscal.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const cfdi = await ComprobanteFiscal.findById(id).populate("cliente", "nombre rfc");
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  return cfdi;
}

async function crear(datos, usuarioId) {
  if (!oid(datos.cliente)) throw new AppError("Cliente inválido", 400);

  // Ligas opcionales — si se mandan, deben apuntar a un registro real (evita
  // guardar una referencia rota por un id con formato válido pero inexistente).
  const [emisor, receptor] = await Promise.all([
    obtenerEmisorFiscal(),
    obtenerReceptorFiscal(datos.cliente),
    datos.factura && oid(datos.factura)
      ? Factura.exists({ _id: datos.factura }).then((ok) => { if (!ok) throw new AppError("Factura no encontrada", 404); })
      : null,
    datos.cotizacion && oid(datos.cotizacion)
      ? Cotizacion.exists({ _id: datos.cotizacion }).then((ok) => { if (!ok) throw new AppError("Cotización no encontrada", 404); })
      : null,
    datos.reporte && oid(datos.reporte)
      ? Reporte.exists({ _id: datos.reporte }).then((ok) => { if (!ok) throw new AppError("Reporte no encontrado", 404); })
      : null,
  ]);

  const { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total } =
    calcularTotales(datos.conceptos);

  const folioInterno = await siguienteFolio("CFDI");

  const datosComprobante = {
    factura: datos.factura || undefined,
    cotizacion: datos.cotizacion || undefined,
    reporte: datos.reporte || undefined,
    cliente: datos.cliente,
    folioInterno,
    serie: datos.serie || emisor.serieCFDI || undefined,
    tipoComprobante: datos.tipoComprobante || "I",
    moneda: datos.moneda || "MXN",
    formaPago: datos.formaPago,
    metodoPago: datos.metodoPago || "PUE",
    lugarExpedicion: emisor.codigoPostalFiscal,
    emisor: { rfc: emisor.rfc, nombre: emisor.nombre, regimenFiscal: emisor.regimenFiscal },
    receptor,
    conceptos,
    subtotal,
    totalImpuestosTrasladados,
    totalImpuestosRetenidos,
    descuento,
    total,
    estado: "borrador",
    comentarios: datos.comentarios,
    registradoPor: usuarioId,
  };

  // Se valida el FORMATO CFDI 4.0 completo (no solo "el campo existe") antes
  // de guardar — un RFC/CP mal escrito se detecta aquí, no hasta que se
  // intente timbrar (o peor, hasta que el PAC lo rechace).
  cfdiBuilder.validarComprobante(datosComprobante);

  const cfdi = await ComprobanteFiscal.create(datosComprobante);

  // Mismo criterio que factura.service.crear (Cobranza): si el CFDI nace de
  // una cotización aprobada, se marca "facturada" para que no se reutilice
  // por error para otro comprobante — sin esto quedaba "aprobada" para
  // siempre aunque ya se hubiera facturado.
  if (datos.cotizacion && oid(datos.cotizacion)) {
    await Cotizacion.updateOne({ _id: datos.cotizacion }, { status: "facturada" });
  }

  return cfdi.populate("cliente", "nombre rfc");
}

/**
 * Elimina (de verdad, no soft-delete) un comprobante que nunca llegó a
 * timbrarse — solo aplica a "borrador"/"error_timbrado" (mismo criterio que
 * ESTADOS_EDITABLES): un CFDI timbrado tiene UUID ante el SAT y no se puede
 * "borrar", solo cancelar (ver `cancelar`). Si nació de una cotización
 * aprobada, la regresa a "aprobada" para que se pueda volver a facturar —
 * si no, quedaría "facturada" para siempre sin ningún CFDI real detrás.
 */
async function eliminar(id) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!ESTADOS_EDITABLES.includes(cfdi.estado)) {
    throw new AppError(
      `No se puede eliminar un comprobante en estado "${cfdi.estado}" — ya fue timbrado ante el SAT, solo se puede cancelar.`,
      409
    );
  }
  if (cfdi.cotizacion) {
    await Cotizacion.updateOne({ _id: cfdi.cotizacion, status: "facturada" }, { status: "aprobada" });
  }
  await ComprobanteFiscal.deleteOne({ _id: cfdi._id });
}

async function actualizar(id, datos) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!ESTADOS_EDITABLES.includes(cfdi.estado)) {
    throw new AppError(`No se puede editar un comprobante en estado "${cfdi.estado}"`, 409);
  }

  if (datos.cliente && String(datos.cliente) !== String(cfdi.cliente)) {
    cfdi.cliente = datos.cliente;
    cfdi.receptor = await obtenerReceptorFiscal(datos.cliente);
  }
  for (const campo of ["serie", "tipoComprobante", "moneda", "formaPago", "metodoPago", "comentarios"]) {
    if (datos[campo] !== undefined) cfdi[campo] = datos[campo];
  }
  if (Array.isArray(datos.conceptos) && datos.conceptos.length) {
    const { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total } =
      calcularTotales(datos.conceptos);
    Object.assign(cfdi, { conceptos, subtotal, totalImpuestosTrasladados, totalImpuestosRetenidos, descuento, total });
  }
  // Reintentar después de un error de timbrado regresa a borrador, no se
  // queda atorado en "error_timbrado" para siempre.
  if (cfdi.estado === "error_timbrado") cfdi.estado = "borrador";

  await cfdi.save();
  return cfdi.populate("cliente", "nombre rfc");
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Timbra ante el PAC configurado. Si no hay PAC configurado, lanza
 * PacNotConfiguredError (503, code PAC_NOT_CONFIGURED) — NUNCA marca el
 * comprobante como timbrado sin una respuesta real del proveedor.
 *
 * Idempotencia: la transición a "timbrando" es un compare-and-swap atómico
 * en Mongo (`findOneAndUpdate` con el estado anterior como filtro). Si dos
 * clics/requests llegan casi al mismo tiempo, solo uno logra el update —
 * el segundo recibe `null` y se rechaza con 409 en vez de timbrar dos veces
 * el mismo comprobante ante el SAT (un timbrado duplicado no se puede
 * deshacer, así que esto se valida ANTES de llamar al PAC, no después).
 *
 * Reintentos: solo para errores marcados `retryable` (red/timeout) por el
 * adaptador — un error de validación del PAC (RFC inválido, etc.) nunca se
 * reintenta solo, porque reintentar no corrige el dato.
 */
async function timbrar(id) {
  const cfdi = await ComprobanteFiscal.findOneAndUpdate(
    { _id: id, estado: { $in: ESTADOS_TIMBRABLES } },
    { $set: { estado: "timbrando" } },
    { new: false } // el doc ANTES del cambio — solo para confirmar que existía
  );
  if (!cfdi) {
    const existente = await ComprobanteFiscal.findById(id).select("estado");
    if (!existente) throw new AppError("Comprobante fiscal no encontrado", 404);
    throw new AppError(
      `No se puede timbrar: el comprobante está en estado "${existente.estado}" (¿ya se está timbrando o cambió de estado en otra pestaña?)`,
      409
    );
  }

  // Se revisa el PAC DESPUÉS del compare-and-swap pero el comprobante ya
  // quedó en "timbrando" — si no hay PAC, se revierte a su estado original
  // en vez de dejarlo atorado.
  let pac;
  try {
    pac = pacFactory.obtenerPac();
  } catch (err) {
    await ComprobanteFiscal.updateOne({ _id: id }, { $set: { estado: cfdi.estado } });
    throw err;
  }

  const snapshot = cfdi.toObject();

  try {
    // Se valida el formato y se arma el XML real del comprobante (sin
    // firmar) justo antes de mandarlo — si algo quedó mal (p. ej. se editó
    // un dato fiscal del cliente después de crear el borrador y ya no
    // cumple formato), se detecta aquí y NUNCA llega a contactar al PAC con
    // un CFDI inválido. Si falla, cae en el catch de abajo igual que
    // cualquier otro error de timbrado — el comprobante no se queda atorado
    // en "timbrando".
    const xmlSinTimbrar = cfdiBuilder.construirXml(snapshot);
    const intentar = () => pac.timbrarFactura({ ...snapshot, estado: "timbrando", xmlSinTimbrar });

    let resultado;
    try {
      resultado = await intentar();
    } catch (err) {
      if (err.retryable) {
        await esperar(RETRY_DELAY_MS);
        resultado = await intentar(); // un único reintento — no reintentar en bucle contra un PAC caído
      } else {
        throw err;
      }
    }

    // El adaptador "resolvió" sin lanzar error, pero si le faltan uuid/xml no
    // es un timbrado real — no confiar en que "no lanzó excepción" equivale
    // a éxito. Esto es lo que de verdad impide "marcar timbrada sin PAC real".
    if (!resultado?.uuid || !resultado?.xml) {
      throw new PacError(
        "El proveedor de timbrado devolvió una respuesta sin uuid/xml — no se puede considerar timbrado",
        { retryable: false }
      );
    }

    const camposTimbrado = {
      estado: "timbrada",
      uuid: resultado.uuid,
      xml: resultado.xml,
      selloSat: resultado.selloSat,
      cadenaOriginal: resultado.cadenaOriginal,
      fechaTimbrado: resultado.fechaTimbrado || new Date(),
    };
    // Un CFDI de Ingreso con MetodoPago PPD empieza a deber su total completo
    // en cuanto se timbra — de ahí en adelante los Complementos de Pago lo
    // van reduciendo (ver emitirComplementoPago).
    if (snapshot.tipoComprobante === "I" && snapshot.metodoPago === "PPD" && snapshot.saldoPendiente == null) {
      camposTimbrado.saldoPendiente = snapshot.total;
    }

    const actualizado = await ComprobanteFiscal.findByIdAndUpdate(
      id,
      { $set: camposTimbrado, $unset: { errorTimbrado: 1 } },
      { new: true }
    ).populate("cliente", "nombre rfc");

    // Si lo que se acaba de timbrar es un Complemento de Pago, se descuenta
    // el monto pagado del saldo del CFDI original que se está liquidando.
    if (snapshot.tipoComprobante === "P" && snapshot.pago?.docRelacionado?.comprobante) {
      await ComprobanteFiscal.updateOne(
        { _id: snapshot.pago.docRelacionado.comprobante },
        { $set: { saldoPendiente: snapshot.pago.docRelacionado.impSaldoInsoluto } }
      );
    }

    await sincronizarCuentaPorCobrar(actualizado, snapshot);

    return actualizado;
  } catch (err) {
    await ComprobanteFiscal.updateOne(
      { _id: id },
      { $set: { estado: "error_timbrado", errorTimbrado: { codigo: err.code || "PAC_ERROR", mensaje: err.message, fecha: new Date() } } }
    );
    throw err;
  }
}

/**
 * Mantiene Cobranza (cuentas por cobrar) al día a partir del CFDI, sin que
 * nadie capture el mismo dato dos veces:
 *  - CFDI de Ingreso timbrado → nace su cuenta por cobrar (PUE: vence al
 *    momento; PPD: a 30 días). Idempotente por `comprobante`.
 *  - Complemento de Pago timbrado que deja el saldo en 0 → la cuenta de la
 *    factura original queda pagada.
 * NUNCA lanza: el CFDI ya está timbrado ante el SAT y eso no debe revertirse
 * ni marcarse como error porque falló un registro interno.
 */
async function sincronizarCuentaPorCobrar(cfdi, snapshot) {
  try {
    if (snapshot.tipoComprobante === "I") {
      if (await Factura.exists({ comprobante: cfdi._id })) return;
      const cotizacion = snapshot.cotizacion ? await Cotizacion.findById(snapshot.cotizacion).select("ordenCompra") : null;
      const fechaCr = cfdi.fechaTimbrado || new Date();
      const diasPago = snapshot.metodoPago === "PPD" ? 30 : 0;
      const folio = `${snapshot.serie ? `${snapshot.serie}-` : ""}${snapshot.folioInterno}`;
      const fechaPago = new Date(fechaCr);
      fechaPago.setDate(fechaPago.getDate() + diasPago);
      await Factura.create({
        cliente: snapshot.cliente, cotizacion: snapshot.cotizacion || undefined, comprobante: cfdi._id,
        oc: cotizacion?.ordenCompra || "S/OC", folio, monto: snapshot.total,
        fechaCr, diasPago, fechaPago, comentarios: `CFDI ${cfdi.uuid}`, registradoPor: snapshot.registradoPor,
      });
      if (snapshot.cotizacion) await Reporte.updateOne({ cotizacion: snapshot.cotizacion }, { factura: folio });
    } else if (snapshot.tipoComprobante === "P" && Number(snapshot.pago?.docRelacionado?.impSaldoInsoluto) === 0) {
      await Factura.updateOne(
        { comprobante: snapshot.pago.docRelacionado.comprobante },
        { statusPago: 1, fechaPagada: snapshot.pago.fechaPago || new Date() }
      );
    }
  } catch (err) {
    console.error("[cfdi] No se pudo sincronizar la cuenta por cobrar:", err.message);
  }
}

// Un CFDI cancelado ya no se cobra: se retira su cuenta por cobrar si sigue pendiente.
async function retirarCuentaPorCobrar(comprobanteId) {
  try {
    await Factura.deleteOne({ comprobante: comprobanteId, statusPago: 0 });
  } catch (err) {
    console.error("[cfdi] No se pudo retirar la cuenta por cobrar:", err.message);
  }
}

/**
 * Solicita la cancelación ante el PAC. Si el comprobante supera el umbral
 * que exige aceptación del receptor, el CFDI NO queda cancelado todavía —
 * pasa a "cancelacion_pendiente" (sigue vigente ante el SAT hasta que el
 * receptor conteste o pasen 72 horas). Ver `resolverSolicitudCancelacion`.
 */
async function cancelar(id, { motivoCodigo, motivo, folioSustitucion }) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (cfdi.estado !== "timbrada") {
    throw new AppError(`Solo se puede cancelar un comprobante timbrado (estado actual: "${cfdi.estado}")`, 409);
  }
  if (motivoCodigo === "01" && !folioSustitucion) {
    throw new AppError('El motivo "01 - Con relación" exige el UUID del CFDI que sustituye a este', 400);
  }

  const pac = pacFactory.obtenerPac(); // lanza PacNotConfiguredError si no hay proveedor

  const resultado = await pac.cancelarFactura({ uuid: cfdi.uuid, motivoCodigo, folioSustitucion, emisorRfc: cfdi.emisor.rfc });
  const requiereAceptacion = Number(cfdi.total) > UMBRAL_ACEPTACION_CANCELACION;
  // Algunos PAC (ej. Dinvbox) solo encolan la cancelación y la resuelven ante
  // el SAT minutos después — `resultado.fechaCancelacion === null` es la
  // señal de que el PAC todavía NO confirma. Si se marcara "cancelada" en
  // ese momento, el sistema mentiría: el CFDI sigue vigente ante el SAT
  // hasta que el PAC lo confirme de verdad.
  const pacConfirmoDeInmediato = !!resultado.fechaCancelacion;

  cfdi.cancelacion = {
    motivoCodigo,
    motivo,
    folioSustitucion,
    fecha: resultado.fechaCancelacion || undefined,
    acuseXml: resultado.acuseXml,
    requiereAceptacion,
    estadoSolicitud: requiereAceptacion ? "pendiente" : "no_aplica",
    fechaLimiteRespuesta: requiereAceptacion
      ? new Date(Date.now() + HORAS_LIMITE_ACEPTACION_CANCELACION * 3600 * 1000)
      : undefined,
  };
  // Mientras el receptor no conteste, o mientras el PAC no confirme, el
  // comprobante SIGUE VIGENTE ante el SAT — no se marca "cancelada" todavía.
  cfdi.estado = requiereAceptacion
    ? "cancelacion_pendiente"
    : (pacConfirmoDeInmediato ? "cancelada" : "cancelacion_en_proceso");

  await cfdi.save();
  if (cfdi.estado === "cancelada") await retirarCuentaPorCobrar(cfdi._id);
  return cfdi.populate("cliente", "nombre rfc");
}

/**
 * Confirma manualmente una cancelación que quedó "en proceso" porque el PAC
 * solo la encoló (ej. Dinvbox tarda 2-3 minutos). No hay webhook ni consulta
 * de estatus confiable todavía (ver consultarFactura en el adaptador de
 * Dinvbox) — por eso esto lo dispara un humano después de verificar el
 * folio como cancelado en el portal del SAT o en el panel del PAC, en vez de
 * que el sistema lo dé por hecho solo.
 */
async function confirmarCancelacionEnProceso(id) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (cfdi.estado !== "cancelacion_en_proceso") {
    throw new AppError(`Este comprobante no tiene una cancelación en proceso (estado actual: "${cfdi.estado}")`, 409);
  }
  cfdi.estado = "cancelada";
  cfdi.cancelacion.fecha = new Date();
  await cfdi.save();
  await retirarCuentaPorCobrar(cfdi._id);
  return cfdi.populate("cliente", "nombre rfc");
}

/**
 * Registra la respuesta del receptor a una solicitud de cancelación
 * pendiente. En un flujo real, esta respuesta llega del receptor a través
 * del portal del SAT o del PAC (no hay ningún endpoint de METRYCO por el que
 * un cliente externo conteste todavía) — por ahora esto sirve para que
 * Calidad/Administración registre manualmente lo que el cliente respondió
 * (por ejemplo, por correo o teléfono), o lo que reporte el PAC cuando se
 * conecte uno con webhook de este evento.
 */
async function resolverSolicitudCancelacion(id, aceptar) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (cfdi.estado !== "cancelacion_pendiente") {
    throw new AppError(`Este comprobante no tiene una solicitud de cancelación pendiente (estado actual: "${cfdi.estado}")`, 409);
  }

  cfdi.estado = aceptar ? "cancelada" : "timbrada";
  cfdi.cancelacion.estadoSolicitud = aceptar ? "aceptada" : "rechazada";
  cfdi.cancelacion.fechaResolucion = new Date();
  await cfdi.save();
  if (aceptar) await retirarCuentaPorCobrar(cfdi._id);
  return cfdi.populate("cliente", "nombre rfc");
}

/**
 * Emite un Complemento de Pago (CFDI tipo "P") contra un CFDI de Ingreso ya
 * timbrado con MetodoPago "PPD". Crea el borrador con Subtotal/Total en 0 y
 * el concepto genérico "Pago" que exige el Anexo 20 — el timbrado real se
 * hace después con `timbrar()`, igual que cualquier otro comprobante.
 *
 * El saldo se calcula del `saldoPendiente` real guardado en el comprobante
 * original (no de lo que mande el frontend) — evita pagar más de lo que se
 * debe o desincronizar el saldo por un cálculo hecho en el cliente.
 */
async function emitirComplementoPago(datos, usuarioId) {
  if (!oid(datos.comprobante)) throw new AppError("Comprobante a pagar inválido", 400);
  const original = await ComprobanteFiscal.findById(datos.comprobante).populate("cliente", "nombre rfc");
  if (!original) throw new AppError("Comprobante a pagar no encontrado", 404);
  if (original.estado !== "timbrada") {
    throw new AppError(`Solo se puede pagar un comprobante timbrado (estado actual: "${original.estado}")`, 409);
  }
  if (original.metodoPago !== "PPD") {
    throw new AppError('El Complemento de Pago solo aplica a comprobantes con Método de Pago "PPD"', 409);
  }
  const saldoAnterior = original.saldoPendiente ?? original.total;
  if (saldoAnterior <= 0) throw new AppError("Este comprobante ya está completamente pagado", 409);
  const monto = Number(datos.monto);
  if (monto > saldoAnterior) {
    throw new AppError(`El monto pagado ($${monto}) no puede ser mayor al saldo pendiente ($${saldoAnterior})`, 400);
  }
  const saldoInsoluto = redondear(saldoAnterior - monto);
  const numParcialidad = (await ComprobanteFiscal.countDocuments({
    "pago.docRelacionado.comprobante": original._id,
    estado: { $ne: "cancelada" },
  })) + 1;

  const emisor = await obtenerEmisorFiscal();
  const folioInterno = await siguienteFolio("CFDI");

  const conceptoPago = {
    claveProdServ: "84111506", // catálogo SAT: "Servicios de facturación" (clave genérica usada para CFDI de Pago)
    descripcion: "Pago",
    cantidad: 1,
    claveUnidad: "ACT", // "Actividad"
    valorUnitario: 0,
    importe: 0,
    objetoImpuesto: "01", // Un CFDI de Pago no es objeto de impuesto
    impuestos: [],
  };

  // Desglose de impuestos DEL DOCUMENTO que se paga y DE ESTE PAGO — el
  // Anexo 20 exige ambos nodos por separado (ver
  // cfdiBuilder.construirComplementoPago), pero NINGUNO de los dos se
  // prorratea por lo que se pagó en esta transacción: el validador real de
  // Dinvbox exige que pago20:TrasladoP (Base e Importe) sea idéntico a
  // pago20:TrasladoDR del documento relacionado (errores CRP20268/CRP20274
  // si no coincide exacto) — lo que de verdad representa cuánto se pagó
  // ahora es el atributo Monto de pago20:Pago, no este desglose de impuestos.
  const impuestosDocumento = cfdiBuilder.agruparImpuestos(original.conceptos);
  const impuestosPago = impuestosDocumento.map((t) => ({ ...t }));

  const datosComprobante = {
    factura: original.factura || undefined,
    cotizacion: original.cotizacion || undefined,
    reporte: original.reporte || undefined,
    cliente: original.cliente._id,
    folioInterno,
    tipoComprobante: "P",
    moneda: "XXX", // fijo por el Anexo 20 cuando tipoComprobante="P" — la moneda real del pago va en pago.moneda/MonedaP
    formaPago: datos.formaPago,
    metodoPago: "PUE", // el propio Complemento de Pago siempre se emite como PUE
    lugarExpedicion: emisor.codigoPostalFiscal,
    emisor: { rfc: emisor.rfc, nombre: emisor.nombre, regimenFiscal: emisor.regimenFiscal },
    receptor: {
      rfc: original.receptor.rfc, nombre: original.receptor.nombre,
      codigoPostal: original.receptor.codigoPostal, regimenFiscal: original.receptor.regimenFiscal,
      usoCFDI: "CP01", // "Pagos" — uso de CFDI fijo para el Complemento de Pago
    },
    conceptos: [conceptoPago],
    subtotal: 0,
    totalImpuestosTrasladados: 0,
    totalImpuestosRetenidos: 0,
    descuento: 0,
    total: 0,
    estado: "borrador",
    comentarios: datos.comentarios,
    registradoPor: usuarioId,
    pago: {
      fechaPago: datos.fechaPago,
      formaPago: datos.formaPago,
      moneda: original.moneda,
      monto,
      numOperacion: datos.numOperacion,
      impuestos: impuestosPago,
      docRelacionado: {
        comprobante: original._id,
        idDocumento: original.uuid,
        serie: original.serie,
        folio: original.folioInterno,
        moneda: original.moneda,
        numParcialidad,
        impSaldoAnterior: saldoAnterior,
        impPagado: monto,
        impSaldoInsoluto: saldoInsoluto,
        objetoImpDR: original.totalImpuestosTrasladados > 0 ? "02" : "01",
        impuestos: impuestosDocumento,
      },
    },
  };

  cfdiBuilder.validarComprobante(datosComprobante);

  const cfdi = await ComprobanteFiscal.create(datosComprobante);
  return cfdi.populate("cliente", "nombre rfc");
}

async function obtenerXml(id) {
  const cfdi = await ComprobanteFiscal.findById(id).select("xml uuid estado folioInterno");
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (cfdi.xml) return { xml: cfdi.xml, nombre: `${cfdi.folioInterno}.xml` };
  if (!cfdi.uuid) throw new AppError("Este comprobante todavía no tiene XML timbrado", 409);
  // El XML normalmente ya se guardó al timbrar — esto es solo un respaldo si
  // el campo local se perdiera, consultando de nuevo al PAC con el uuid.
  const pac = pacFactory.obtenerPac();
  const xml = await pac.obtenerXml(cfdi.uuid);
  return { xml, nombre: `${cfdi.folioInterno}.xml` };
}

/**
 * Genera el XML sin timbrar de un borrador PARA REVISARLO — no llama al PAC,
 * no cambia el estado, no se guarda. Es lo mismo que arma `timbrar()` justo
 * antes de mandarlo, expuesto aparte para poder verlo aunque no haya (o no
 * se quiera usar todavía) un PAC configurado.
 */
async function previsualizarXml(id) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  const xml = cfdiBuilder.construirXml(cfdi.toObject());
  return { xml, nombre: `${cfdi.folioInterno}-preview.xml` };
}

async function obtenerPdf(id) {
  const cfdi = await ComprobanteFiscal.findById(id);
  if (!cfdi) throw new AppError("Comprobante fiscal no encontrado", 404);
  if (!cfdi.uuid) throw new AppError("Este comprobante todavía no está timbrado", 409);
  // Representación impresa generada localmente (branding del laboratorio,
  // configurable en Administración) — no depende de que el PAC ofrezca PDF.
  const buffer = await generarPdfCfdi(cfdi.toObject());
  return { buffer, nombre: `${cfdi.folioInterno}.pdf` };
}

module.exports = {
  calcularTotales, listar, obtener, crear, actualizar, eliminar, timbrar, cancelar, obtenerXml, obtenerPdf,
  previsualizarXml, obtenerEmisorFiscal, obtenerReceptorFiscal,
  resolverSolicitudCancelacion, confirmarCancelacionEnProceso, emitirComplementoPago,
};

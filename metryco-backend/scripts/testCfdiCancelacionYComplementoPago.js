require("dotenv").config();
const mongoose = require("mongoose");
require("../src/models/Equipo");
const Cliente = require("../src/models/Cliente");
const ComprobanteFiscal = require("../src/models/ComprobanteFiscal");
const cfdiService = require("../src/services/cfdi.service");
const configuracionService = require("../src/services/configuracion.service");
const pacFactory = require("../src/services/pac/pacFactory");
const PacProvider = require("../src/services/pac/PacProvider");

let uuidSeq = 0;
class FakePac extends PacProvider {
  async timbrarFactura() {
    uuidSeq++;
    return { uuid: `aaaaaaaa-aaaa-aaaa-aaaa-${String(uuidSeq).padStart(12, "0")}`, xml: "<cfdi:Comprobante/>", fechaTimbrado: new Date() };
  }
  async cancelarFactura() { return { estatus: "En proceso", fechaCancelacion: new Date() }; }
}
pacFactory.obtenerPac = () => new FakePac();

const CONCEPTO_GRAVADO = (valorUnitario) => ({
  claveProdServ: "80101504", descripcion: "Calibración", cantidad: 1, claveUnidad: "E48",
  valorUnitario, objetoImpuesto: "02",
  impuestos: [{ tipo: "traslado", impuesto: "002", tipoFactor: "Tasa", tasaOCuota: 0.16, base: valorUnitario, importe: redondear2(valorUnitario * 0.16) }],
});
function redondear2(n) { return Math.round(n * 100) / 100; }

async function crearYTimbrar(clienteId, valorUnitario, metodoPago) {
  const cfdi = await cfdiService.crear({
    cliente: clienteId, formaPago: "03", metodoPago,
    conceptos: [CONCEPTO_GRAVADO(valorUnitario)],
  });
  return cfdiService.timbrar(cfdi._id);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const cliente = await Cliente.findOne({ nombre: /Industrias Ejemplo/i });
  const cfgAntes = await configuracionService.obtenerLaboratorio();
  await configuracionService.actualizarLaboratorio({ ...cfgAntes, regimenFiscal: "601", codigoPostalFiscal: "32340" });

  const creados = [];

  // --- 1. Cancelación bajo $5,000 -> directa a "cancelada" ---
  console.log("1) Cancelar un CFDI de $500 (bajo el umbral)");
  const c1 = await crearYTimbrar(cliente._id, 500, "PUE"); creados.push(c1._id);
  const c1cancelado = await cfdiService.cancelar(c1._id, { motivoCodigo: "02" });
  console.log("   estado:", c1cancelado.estado, "| requiereAceptacion:", c1cancelado.cancelacion.requiereAceptacion);
  console.log("  ", c1cancelado.estado === "cancelada" && !c1cancelado.cancelacion.requiereAceptacion ? "OK" : "FALLO");

  // --- 2. Cancelación sobre $5,000 -> "cancelacion_pendiente" ---
  console.log("\n2) Cancelar un CFDI de $10,000 (sobre el umbral)");
  const c2 = await crearYTimbrar(cliente._id, 10000, "PUE"); creados.push(c2._id);
  const c2pendiente = await cfdiService.cancelar(c2._id, { motivoCodigo: "02" });
  console.log("   estado:", c2pendiente.estado, "| requiereAceptacion:", c2pendiente.cancelacion.requiereAceptacion, "| estadoSolicitud:", c2pendiente.cancelacion.estadoSolicitud);
  console.log("   fechaLimiteRespuesta presente:", !!c2pendiente.cancelacion.fechaLimiteRespuesta);
  console.log("  ", (c2pendiente.estado === "cancelacion_pendiente" && c2pendiente.cancelacion.requiereAceptacion) ? "OK" : "FALLO");

  // --- 3. El receptor "acepta" -> ahora sí cancelada ---
  const c2aceptado = await cfdiService.resolverSolicitudCancelacion(c2._id, true);
  console.log("3) Receptor acepta la cancelación:", c2aceptado.estado === "cancelada" ? "OK" : "FALLO " + c2aceptado.estado);

  // --- 4. Otro caso: el receptor RECHAZA -> vuelve a timbrada ---
  console.log("\n4) Receptor rechaza la cancelación (CFDI debe seguir vigente)");
  const c4 = await crearYTimbrar(cliente._id, 8000, "PUE"); creados.push(c4._id);
  await cfdiService.cancelar(c4._id, { motivoCodigo: "03" });
  const c4rechazado = await cfdiService.resolverSolicitudCancelacion(c4._id, false);
  console.log("  ", c4rechazado.estado === "timbrada" ? "OK (sigue vigente)" : "FALLO " + c4rechazado.estado);

  // --- 5. motivoCodigo=01 sin folioSustitucion -> rechazado ---
  console.log("\n5) Cancelar con motivo 01 sin folioSustitucion");
  const c5 = await crearYTimbrar(cliente._id, 100, "PUE"); creados.push(c5._id);
  try {
    await cfdiService.cancelar(c5._id, { motivoCodigo: "01" });
    console.log("   FALLO: no lo rechazó");
  } catch (e) {
    console.log("  ", e.message.includes("Con relación") ? "OK" : "FALLO " + e.message);
  }

  // --- 6. Complemento de Pago completo ---
  console.log("\n6) Complemento de Pago sobre un CFDI PPD de $1,000, dos pagos parciales");
  const original = await crearYTimbrar(cliente._id, 1000, "PPD"); creados.push(original._id);
  const originalDoc = await ComprobanteFiscal.findById(original._id);
  console.log("   saldoPendiente inicial tras timbrar (esperado 1160):", originalDoc.saldoPendiente);

  const pago1 = await cfdiService.emitirComplementoPago({
    comprobante: original._id, fechaPago: new Date(), formaPago: "03", monto: 700,
  }, null);
  creados.push(pago1._id);
  console.log("   Pago 1 creado, docRelacionado.impSaldoAnterior:", pago1.pago.docRelacionado.impSaldoAnterior, "| impSaldoInsoluto:", pago1.pago.docRelacionado.impSaldoInsoluto);
  const pago1Timbrado = await cfdiService.timbrar(pago1._id);
  console.log("   Pago 1 timbrado:", pago1Timbrado.estado, "| uuid:", !!pago1Timbrado.uuid);
  const originalTrasPago1 = await ComprobanteFiscal.findById(original._id);
  console.log("   saldoPendiente del original tras pago 1 (esperado 460):", originalTrasPago1.saldoPendiente);

  const pago2 = await cfdiService.emitirComplementoPago({
    comprobante: original._id, fechaPago: new Date(), formaPago: "03", monto: 460,
  }, null);
  creados.push(pago2._id);
  console.log("   Pago 2, numParcialidad:", pago2.pago.docRelacionado.numParcialidad, "(esperado 2)");
  await cfdiService.timbrar(pago2._id);
  const originalTrasPago2 = await ComprobanteFiscal.findById(original._id);
  console.log("   saldoPendiente del original tras pago 2 (esperado 0):", originalTrasPago2.saldoPendiente);
  console.log("  ", originalTrasPago2.saldoPendiente === 0 ? "OK: saldo llegó a 0" : "FALLO");

  // --- 7. Intentar pagar más del saldo restante ---
  console.log("\n7) Intentar registrar un pago con monto mayor al saldo pendiente");
  try {
    await cfdiService.emitirComplementoPago({ comprobante: original._id, fechaPago: new Date(), formaPago: "03", monto: 1 }, null);
    console.log("   FALLO: no lo rechazó (el saldo ya es 0)");
  } catch (e) {
    console.log("  ", e.message.includes("completamente pagado") ? "OK" : "FALLO " + e.message);
  }

  // --- 8. Intentar Complemento de Pago contra un PUE ---
  console.log("\n8) Intentar Complemento de Pago contra un CFDI PUE (no debe permitirse)");
  const cPue = await crearYTimbrar(cliente._id, 300, "PUE"); creados.push(cPue._id);
  try {
    await cfdiService.emitirComplementoPago({ comprobante: cPue._id, fechaPago: new Date(), formaPago: "03", monto: 100 }, null);
    console.log("   FALLO: no lo rechazó");
  } catch (e) {
    console.log("  ", e.message.includes("PPD") ? "OK" : "FALLO " + e.message);
  }

  // --- 9. XML del Complemento de Pago bien formado ---
  console.log("\n9) XML del Complemento de Pago");
  const pago1Doc = await ComprobanteFiscal.findById(pago1._id);
  const preview = await cfdiService.previsualizarXml(pago1Doc._id);
  const tieneNodoPagos = preview.xml.includes('xmlns:pago20="http://www.sat.gob.mx/Pagos20"') && preview.xml.includes("<pago20:DoctoRelacionado");
  console.log("   Contiene el nodo pago20:Pagos/DoctoRelacionado:", tieneNodoPagos ? "OK" : "FALLO");
  console.log("   SubTotal=0.00 y Total=0.00:", preview.xml.includes('SubTotal="0.00"') && preview.xml.includes('Total="0.00"') ? "OK" : "FALLO");

  // --- 10. Confirmar que un CFDI normal (I, PUE) sigue funcionando ---
  console.log("\n10) CFDI normal sigue timbrando bien");
  const normal = await crearYTimbrar(cliente._id, 250, "PUE"); creados.push(normal._id);
  console.log("  ", normal.estado === "timbrada" ? "OK" : "FALLO");

  // limpieza
  await ComprobanteFiscal.deleteMany({ _id: { $in: creados } });
  await configuracionService.actualizarLaboratorio(cfgAntes);
  console.log("\nLimpieza OK —", creados.length, "comprobantes de prueba eliminados.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

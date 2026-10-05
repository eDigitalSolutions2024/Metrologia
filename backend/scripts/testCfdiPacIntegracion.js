/**
 * Pruebas de integración con un PAC FALSO — solo para probar el contrato
 * interno (errores, reintentos, idempotencia). NO es timbrado fiscal real,
 * no genera UUID/XML válidos ante el SAT, es exclusivamente para verificar
 * que cfdi.service.js reacciona correctamente a cada tipo de respuesta.
 */
require("dotenv").config();
const mongoose = require("mongoose");
require("../src/models/Equipo");
const Cliente = require("../src/models/Cliente");
const ComprobanteFiscal = require("../src/models/ComprobanteFiscal");
const cfdiService = require("../src/services/cfdi.service");
const configuracionService = require("../src/services/configuracion.service");
const pacFactory = require("../src/services/pac/pacFactory");
const PacProvider = require("../src/services/pac/PacProvider");
const PacError = require("../src/services/pac/PacError");

class FakePacProvider extends PacProvider {
  constructor() { super(); this.llamadas = 0; this.modo = "ok"; }
  async timbrarFactura() {
    this.llamadas++;
    if (this.modo === "auth") throw new PacError("Credenciales inválidas ante el PAC", { retryable: false, providerCode: "401", statusCode: 401 });
    if (this.modo === "validacion") throw new PacError("RFC del receptor no coincide con el registrado en el SAT", { retryable: false, providerCode: "CFDI33101" });
    if (this.modo === "timeout-1vez") {
      if (this.llamadas === 1) throw new PacError("Timeout conectando al PAC", { retryable: true });
      return { uuid: "11111111-1111-1111-1111-111111111111", xml: "<cfdi:Comprobante/>", fechaTimbrado: new Date() };
    }
    if (this.modo === "timeout-siempre") throw new PacError("Timeout conectando al PAC", { retryable: true });
    if (this.modo === "invalida") return { uuid: undefined, xml: undefined }; // respuesta "exitosa" pero sin los datos mínimos
    return { uuid: "22222222-2222-2222-2222-222222222222", xml: "<cfdi:Comprobante/>", selloSat: "sello-fake", fechaTimbrado: new Date() };
  }
  async cancelarFactura() { return { estatus: "Cancelado", fechaCancelacion: new Date() }; }
  async consultarFactura(uuid) { return { estatus: uuid ? "Vigente" : "No encontrado" }; }
  async obtenerXml() { return "<cfdi:Comprobante/>"; }
  async obtenerPdf() { return Buffer.from("PDF-FAKE"); }
}

const fake = new FakePacProvider();
const obtenerPacReal = pacFactory.obtenerPac; // guardado ANTES de sobreescribir, para el caso 1
// Sustituye SOLO en memoria de este proceso de prueba — nunca toca .env ni
// configura un PAC real. cfdi.service.js llama pacFactory.obtenerPac() en
// vivo (no destructurado), así que este override sí surte efecto.
pacFactory.obtenerPac = () => fake;

async function crearBorrador(clienteId) {
  return cfdiService.crear({
    cliente: clienteId, formaPago: "03",
    conceptos: [{ claveProdServ: "80101504", descripcion: "Prueba", cantidad: 1, claveUnidad: "E48", valorUnitario: 100, objetoImpuesto: "02", impuestos: [{ tipo: "traslado", tasaOCuota: 0.16, base: 100, importe: 16 }] }],
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const cliente = await Cliente.findOne({ nombre: /Industrias Ejemplo/i });
  const cfgAntes = await configuracionService.obtenerLaboratorio();
  await configuracionService.actualizarLaboratorio({ ...cfgAntes, regimenFiscal: "601", codigoPostalFiscal: "32340" });

  const creados = [];

  // 1. PAC no configurado (sin fake instalado)
  pacFactory.obtenerPac = obtenerPacReal;
  const c1 = await crearBorrador(cliente._id); creados.push(c1._id);
  try { await cfdiService.timbrar(c1._id); console.log("1) PAC no configurado: FALLO no bloqueó"); }
  catch (e) { console.log("1) PAC no configurado:", e.code === "PAC_NOT_CONFIGURED" ? "OK" : "FALLO " + e.message); }
  pacFactory.obtenerPac = () => fake; // vuelve a instalar el fake para el resto

  // 2. Error de autenticación (no retryable)
  fake.modo = "auth";
  const c2 = await crearBorrador(cliente._id); creados.push(c2._id);
  try { await cfdiService.timbrar(c2._id); console.log("2) Error de autenticación: FALLO no propagó el error"); }
  catch (e) { console.log("2) Error de autenticación:", e.message.includes("Credenciales") ? "OK" : "FALLO " + e.message); }
  const c2Doc = await ComprobanteFiscal.findById(c2._id);
  console.log("   estado tras el fallo (debe ser error_timbrado):", c2Doc.estado, c2Doc.estado === "error_timbrado" ? "OK" : "FALLO");

  // 3. Error de validación del PAC (no retryable)
  fake.modo = "validacion";
  const c3 = await crearBorrador(cliente._id); creados.push(c3._id);
  try { await cfdiService.timbrar(c3._id); console.log("3) Error de validación: FALLO no propagó"); }
  catch (e) { console.log("3) Error de validación:", e.message.includes("RFC del receptor") ? "OK" : "FALLO " + e.message); }

  // 4. Timeout que se recupera al reintentar UNA vez (retryable=true)
  fake.modo = "timeout-1vez"; fake.llamadas = 0;
  const c4 = await crearBorrador(cliente._id); creados.push(c4._id);
  const r4 = await cfdiService.timbrar(c4._id);
  console.log("4) Timeout + reintento automático:", (r4.estado === "timbrada" && fake.llamadas === 2) ? "OK (se recuperó al segundo intento)" : `FALLO (estado=${r4.estado}, llamadas=${fake.llamadas})`);

  // 5. Timeout persistente (el único reintento también falla) -> error, no bucle infinito
  fake.modo = "timeout-siempre"; fake.llamadas = 0;
  const c5 = await crearBorrador(cliente._id); creados.push(c5._id);
  const inicio = Date.now();
  try { await cfdiService.timbrar(c5._id); console.log("5) Timeout persistente: FALLO no lanzó error"); }
  catch (e) { console.log("5) Timeout persistente:", (fake.llamadas === 2) ? `OK (2 intentos, no reintentó en bucle, ${Date.now() - inicio}ms)` : `FALLO (llamadas=${fake.llamadas})`); }

  // 6. Respuesta "exitosa" pero sin uuid/xml -> NO debe marcarse timbrada
  fake.modo = "invalida";
  const c6 = await crearBorrador(cliente._id); creados.push(c6._id);
  try {
    await cfdiService.timbrar(c6._id);
    console.log("6) Respuesta inválida del PAC (sin uuid): FALLO — se marcó timbrada sin uuid/xml reales");
  } catch (e) {
    const c6Doc = await ComprobanteFiscal.findById(c6._id);
    console.log("6) Respuesta inválida del PAC (sin uuid):", (c6Doc.estado === "error_timbrado" && e.message.includes("sin uuid/xml")) ? "OK — rechazada, no se marcó timbrada" : `FALLO (${c6Doc.estado})`);
  }

  // 7. Duplicado / idempotencia: timbrar dos veces "en paralelo" el mismo borrador
  fake.modo = "ok";
  const c7 = await crearBorrador(cliente._id); creados.push(c7._id);
  const [res7a, res7b] = await Promise.allSettled([cfdiService.timbrar(c7._id), cfdiService.timbrar(c7._id)]);
  const okCount = [res7a, res7b].filter((r) => r.status === "fulfilled").length;
  const failCount = [res7a, res7b].filter((r) => r.status === "rejected").length;
  console.log("7) Timbrado duplicado en paralelo:", (okCount === 1 && failCount === 1) ? "OK (solo uno ganó, el otro fue rechazado con 409)" : `FALLO (ok=${okCount}, fail=${failCount})`);
  if (failCount === 1) {
    const rechazado = [res7a, res7b].find((r) => r.status === "rejected");
    console.log("   mensaje del rechazado:", rechazado.reason.message);
  }

  // 8. Timbrar de nuevo algo ya timbrado -> debe rechazar (no duplica timbrado real)
  try { await cfdiService.timbrar(c7._id); console.log("8) Re-timbrar algo ya timbrado: FALLO no bloqueó"); }
  catch (e) { console.log("8) Re-timbrar algo ya timbrado:", e.statusCode === 409 ? "OK" : "FALLO " + e.message); }

  // 9. Cancelación
  const cancelado = await cfdiService.cancelar(c7._id, { motivo: "Prueba de cancelación" });
  console.log("9) Cancelación:", cancelado.estado === "cancelada" ? "OK" : "FALLO " + cancelado.estado);

  // 10. Consulta (directo al fake, cfdi.service no expone consultarFactura como endpoint propio todavía)
  const consulta = await fake.consultarFactura(cancelado.uuid);
  console.log("10) Consulta de estatus:", consulta.estatus === "Vigente" ? "OK" : "FALLO " + JSON.stringify(consulta));

  await ComprobanteFiscal.deleteMany({ _id: { $in: creados } });
  await configuracionService.actualizarLaboratorio(cfgAntes);
  console.log("\nLimpieza OK —", creados.length, "comprobantes de prueba eliminados, laboratorio restaurado.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

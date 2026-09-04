/**
 * Siembra COMPLETA de datos de demostración: corre los seeds existentes
 * (catálogos, cliente único, y los 5 reportes) y luego RELLENA prácticamente
 * todos los campos de todos los módulos (Usuarios, Clientes/Contactos,
 * Equipos, Patrones, Certificados, Performance, Actividades, Cobranza,
 * RazonSocial, Configuración) para poder navegar el sistema con información
 * realista en cada pantalla.
 *
 * Idempotente: se puede correr varias veces sin duplicar (usa upsert / busca
 * antes de crear en cada bloque).
 *
 *   node scripts/seedCompleto.js
 */
require("dotenv/config");
const { execSync } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");

const Usuario = require("../src/models/Usuario");
const Cliente = require("../src/models/Cliente");
const Contacto = require("../src/models/Contacto");
const Equipo = require("../src/models/Equipo");
const Patron = require("../src/models/Patron");
const Reporte = require("../src/models/Reporte");
const Asignacion = require("../src/models/Asignacion");
const Performance = require("../src/models/Performance");
const RazonSocial = require("../src/models/RazonSocial");

const patronSvc = require("../src/services/patron.service");
const certificadoSvc = require("../src/services/certificado.service");
const actividadSvc = require("../src/services/actividad.service");
const facturaSvc = require("../src/services/factura.service");
const razonSocialSvc = require("../src/services/razonSocial.service");
const configuracionSvc = require("../src/services/configuracion.service");
const performanceSvc = require("../src/services/performance.service");

const RFC_DEMO_1 = ["RSD030303RS1", "IPJ040404IP2", "ELN050505EL3", "AGF060606AG4", "MTQ070707MT5"];

function correr(script) {
  console.log(`\n=== ${script} ===`);
  execSync(`node ${path.join(__dirname, script)}`, { stdio: "inherit", cwd: path.join(__dirname, "..") });
}

async function run() {
  // 1) Reusa los seeds existentes (catálogos + cliente único + 5 reportes demo).
  correr("seedMetrologia.js");
  correr("seedMagnitudes.js");
  correr("seedPlantillasIncertidumbre.js");
  correr("seedDemo.js");
  correr("seedReporteDemo.js");

  console.log("\n=== seedCompleto.js: enriqueciendo campos ===");
  await mongoose.connect(mongoUri);

  const admin = await Usuario.findOne({ rol: "admin" });
  const reqUser = { id: admin._id.toString(), usuario: admin.usuario, rol: admin.rol };
  const tecnicos = await Usuario.find({ rol: "tecnico" }).sort({ createdAt: 1 });

  // ------------------------------------------------------------------
  // RazonSocial
  // ------------------------------------------------------------------
  if (!(await RazonSocial.exists({ nombre: /Metrolog[ií]a de Ju[aá]rez/i }))) {
    await razonSocialSvc.crear({
      nombre: "Metrología de Juárez SA de CV",
      rfc: "MJU120101AB3",
      domicilio: "Av. Tecnológico 4010, Ex Hipódromo, Juárez, Chihuahua, C.P. 32310",
      telefono: "656-611-2200",
      acreditacion: "EMA Acreditación 0123-CAL, ISO/IEC 17025:2017",
      activo: true,
    });
    console.log("· RazonSocial: Metrología de Juárez SA de CV");
  }
  if (!(await RazonSocial.exists({ nombre: /Metrolog[ií]a Industrial del Norte/i }))) {
    await razonSocialSvc.crear({
      nombre: "Metrología Industrial del Norte SA de CV",
      rfc: "MIN150202XY7",
      domicilio: "Calle Ohio 1450, Complejo Industrial Chihuahua, Chihuahua, C.P. 31136",
      telefono: "614-430-5588",
      acreditacion: "EMA Acreditación 0456-CAL",
      activo: true,
    });
    console.log("· RazonSocial: Metrología Industrial del Norte SA de CV");
  }

  // ------------------------------------------------------------------
  // Configuración (laboratorio + colores) — solo si sigue vacío
  // ------------------------------------------------------------------
  const lab = await configuracionSvc.obtenerLaboratorio();
  if (!lab.rfc && !lab.domicilio) {
    await configuracionSvc.actualizarLaboratorio({
      nombre: "Metrología de Juárez SA de CV",
      acreditacion: "EMA Acreditación 0123-CAL, ISO/IEC 17025:2017",
      rfc: "MJU120101AB3",
      domicilio: "Av. Tecnológico 4010, Ex Hipódromo, Juárez, Chihuahua, C.P. 32310",
      telefono: "656-611-2200",
    });
    console.log("· Configuración: datos del laboratorio");
  }

  // ------------------------------------------------------------------
  // Usuarios: colores de avatar, observaciones, un usuario inactivo
  // ------------------------------------------------------------------
  const AVATAR_COLORES = ["#2563EB", "#7C3AED", "#DB2777", "#059669", "#D97706", "#0891B2"];
  const todosUsuarios = await Usuario.find({});
  for (const [i, u] of todosUsuarios.entries()) {
    const cambios = {};
    if (!u.avatarColor) cambios.avatarColor = AVATAR_COLORES[i % AVATAR_COLORES.length];
    if (!u.observaciones?.length) {
      cambios.observaciones = [
        { texto: "Alta inicial en el sistema, sin incidencias.", autor: admin.nombre, fecha: new Date(Date.now() - 60 * 86400000) },
      ];
    }
    if (Object.keys(cambios).length) await Usuario.updateOne({ _id: u._id }, cambios);
  }
  if (!(await Usuario.exists({ usuario: "ventas.inactivo" }))) {
    const hash = await bcrypt.hash("Demo2026!", 10);
    await Usuario.create({
      nombre: "Ventas Baja Demo", usuario: "ventas.inactivo", email: "ventas.inactivo@example.com",
      passwordHash: hash, rol: "ventas", status: "inactivo", avatarColor: "#6B7280",
      observaciones: [{ texto: "Usuario dado de baja — dejó el laboratorio.", autor: admin.nombre, fecha: new Date(Date.now() - 10 * 86400000) }],
    });
    console.log("· Usuario inactivo demo: ventas.inactivo");
  }

  // ------------------------------------------------------------------
  // Clientes: campos fiscales/comerciales completos + 2do contacto
  // ------------------------------------------------------------------
  const REGIMENES = ["601 - General de Ley Personas Morales", "612 - Personas Físicas con Actividades Empresariales"];
  const SECTORES = ["Manufactura automotriz", "Plásticos y empaque", "Electrónica", "Agroindustria", "Textil"];
  const clientesDemo = await Cliente.find({ rfc: { $in: RFC_DEMO_1 } });
  for (const [i, c] of clientesDemo.entries()) {
    const cambios = {};
    if (!c.regimenFiscal) cambios.regimenFiscal = REGIMENES[i % REGIMENES.length];
    if (!c.usoCFDI) cambios.usoCFDI = "G03";
    if (!c.sector) cambios.sector = SECTORES[i % SECTORES.length];
    if (!c.diasContraRecibo?.length) cambios.diasContraRecibo = ["lunes", "miercoles", "viernes"];
    if (!c.facturacion?.formaPago) {
      cambios.facturacion = { formaPago: "03", metodoPago: "PPD", numCuenta: `CTA-${1000 + i}` };
    }
    if (c.contacto && !c.contacto.emailFacturacion) {
      cambios["contacto.emailFacturacion"] = `facturacion@${(c.nombreComercial || c.nombre).toLowerCase().replace(/\s+/g, "")}-demo.mx`;
    }
    if (Object.keys(cambios).length) await Cliente.updateOne({ _id: c._id }, cambios);

    const contactosExistentes = await Contacto.countDocuments({ cliente: c._id });
    if (contactosExistentes < 2) {
      await Contacto.create({
        cliente: c._id,
        nombre: "Contacto de Facturación",
        telefono: `656-${900 + i}-${1000 + i}`,
        correo: `facturacion@${(c.nombreComercial || c.nombre).toLowerCase().replace(/\s+/g, "")}-demo.mx`,
        emailFacturacion: `facturacion@${(c.nombreComercial || c.nombre).toLowerCase().replace(/\s+/g, "")}-demo.mx`,
        status: "activo",
      });
    }
  }
  console.log(`· ${clientesDemo.length} clientes enriquecidos (fiscal/comercial) + 2do contacto`);

  // ------------------------------------------------------------------
  // Equipos: localización, comentarios, costo, moneda, rango de uso
  // ------------------------------------------------------------------
  const UBICACIONES = ["Línea de producción 1", "Almacén de calidad", "Taller de mantenimiento", "Laboratorio interno", "Área de metrología"];
  const equiposDemo = await Equipo.find({ cliente: { $in: clientesDemo.map((c) => c._id) } });
  for (const [i, eq] of equiposDemo.entries()) {
    const cambios = {};
    if (!eq.localizacion) cambios.localizacion = UBICACIONES[i % UBICACIONES.length];
    if (!eq.comentarios) cambios.comentarios = "Equipo en buen estado, sin daños visibles al recibirlo.";
    if (eq.costo == null) cambios.costo = 5000 + (i % 6) * 1500;
    if (!eq.moneda) cambios.moneda = "MXN";
    if (!eq.rangoUso) cambios.rangoUso = eq.rango || eq.rangoCalibracion || "0-100";
    if (!eq.subtipo) cambios.subtipo = "DIGITAL";
    if (!eq.divisionMinima) cambios.divisionMinima = "0.01";
    if (!eq.resolucion) cambios.resolucion = "0.01";
    if (Object.keys(cambios).length) await Equipo.updateOne({ _id: eq._id }, cambios);
  }
  console.log(`· ${equiposDemo.length} equipos enriquecidos (ubicación/costo/rango)`);

  // ------------------------------------------------------------------
  // Patrones adicionales (masa, presión, temperatura, eléctrica) con
  // todos los campos de operación llenos.
  // ------------------------------------------------------------------
  const PATRONES_EXTRA = [
    {
      codigo: "PAT-DEMO-02", nombre: "Juego de pesas patrón clase E2 (1 g – 1 kg)",
      descripcion: "Juego de pesas de acero inoxidable, clase E2", categoria: "Masa", magnitud: "masa",
      marca: "Troemner", modelo: "E2-SET-1KG", serie: "DEMO-PE-02", unidad: "g",
      intervaloMedicion: "1 g – 1000 g", resolucion: "—",
      incertidumbre: { modo: "tabla", k: 2, unidad: "mg", puntos: [{ nominal: 1, U: 0.005 }, { nominal: 100, U: 0.05 }, { nominal: 1000, U: 0.25 }] },
      deriva: { valor: 0.01, unidad: "mg", periodoMeses: 12 },
      trazabilidad: "CENAM",
      calibracion: { laboratorio: "CENAM", numeroCertificado: "CENAM-DEMO-2026-002", fecha: new Date("2026-01-15"), periodicidadMeses: 24 },
      condicionesReferencia: "20 ± 2 °C, 40–60 % HR, sin corrientes de aire",
      manejo: "Manipular únicamente con pinzas o guantes de nitrilo; nunca con las manos.",
      procedimiento: "PRO-CAL-MASA-01",
      transporte: "Estuche rígido acolchado, en posición horizontal.",
      almacenamiento: "Gabinete con control de humedad, alejado de fuentes de calor.",
    },
    {
      codigo: "PAT-DEMO-03", nombre: "Calibrador de presión patrón (0–20 bar)",
      descripcion: "Calibrador de presión digital de referencia", categoria: "Presion", magnitud: "presion",
      marca: "Fluke", modelo: "719Pro", serie: "DEMO-PR-03", unidad: "bar",
      intervaloMedicion: "0–20 bar", resolucion: "0.001 bar",
      incertidumbre: { modo: "fija", k: 2, unidad: "bar", valor: 0.006 },
      deriva: { valor: 0.002, unidad: "bar", periodoMeses: 12 },
      trazabilidad: "NIST vía Fluke Calibration",
      calibracion: { laboratorio: "Fluke Calibration", numeroCertificado: "FLK-DEMO-2026-003", fecha: new Date("2026-03-01"), periodicidadMeses: 12 },
      condicionesReferencia: "20 ± 1 °C, presión atmosférica estable",
      manejo: "Purgar la línea antes de conectar; evitar golpes al transductor.",
      procedimiento: "PRO-CAL-PRES-01",
      transporte: "Maleta rígida con espuma de protección.",
      almacenamiento: "Anaquel interior, lejos de vibración y polvo.",
    },
    {
      codigo: "PAT-DEMO-04", nombre: "Termómetro patrón PRT (−20 a 150 °C)",
      descripcion: "Termómetro de resistencia de platino patrón", categoria: "Temperatura", magnitud: "temperatura",
      marca: "Fluke", modelo: "5628", serie: "DEMO-TE-04", unidad: "°C",
      intervaloMedicion: "−20 a 150 °C", resolucion: "0.001 °C",
      incertidumbre: { modo: "fija", k: 2, unidad: "°C", valor: 0.015 },
      deriva: { valor: 0.005, unidad: "°C", periodoMeses: 12 },
      trazabilidad: "CENAM",
      calibracion: { laboratorio: "CENAM", numeroCertificado: "CENAM-DEMO-2026-004", fecha: new Date("2026-02-20"), periodicidadMeses: 12 },
      condicionesReferencia: "Baño de calibración estabilizado ± 0.01 °C",
      manejo: "Evitar choques térmicos y dobleces en el vástago.",
      procedimiento: "PRO-CAL-TEMP-01",
      transporte: "Tubo protector rígido, en posición vertical.",
      almacenamiento: "Estuche original con gel de sílice.",
    },
    {
      codigo: "PAT-DEMO-05", nombre: "Calibrador multifunción patrón",
      descripcion: "Fuente/medidor multifunción de referencia eléctrica", categoria: "Electrica", magnitud: "electrica",
      marca: "Fluke", modelo: "5522A", serie: "DEMO-EL-05", unidad: "V",
      intervaloMedicion: "0–1000 V", resolucion: "0.0001 V",
      incertidumbre: { modo: "fija", k: 2, unidad: "V", valor: 0.002 },
      deriva: { valor: 0.0005, unidad: "V", periodoMeses: 12 },
      trazabilidad: "NIST vía Fluke Calibration",
      calibracion: { laboratorio: "Fluke Calibration", numeroCertificado: "FLK-DEMO-2026-005", fecha: new Date("2026-01-25"), periodicidadMeses: 12 },
      condicionesReferencia: "23 ± 1 °C, sin campos electromagnéticos cercanos",
      manejo: "Desconectar cables antes de mover el equipo; no exceder el rango indicado.",
      procedimiento: "PRO-CAL-ELEC-01",
      transporte: "Case de transporte con ruedas, cables enrollados.",
      almacenamiento: "Rack eléctrico con conexión a tierra.",
    },
  ];
  for (const spec of PATRONES_EXTRA) {
    if (await Patron.exists({ codigo: spec.codigo })) continue;
    const p = await patronSvc.crear(spec, reqUser);
    console.log("· Patrón demo:", p.codigo, "-", p.nombre);
  }

  // ------------------------------------------------------------------
  // Certificados: emite uno por cada reporte demo que ya tenga una
  // asignación autorizada por Calidad (ESTADOS[1] en seedReporteDemo.js).
  // ------------------------------------------------------------------
  const reportesDemo = await Reporte.find({ ordenCompra: { $regex: /^OC-DEMO-/ } });
  let certsCreados = 0;
  for (const rep of reportesDemo) {
    const asigAutorizada = await Asignacion.findOne({ reporte: rep._id, "estados.certificado": "autorizado" });
    if (!asigAutorizada) continue;
    if (await mongoose.model("Certificado").exists({ asignacion: asigAutorizada._id })) continue;

    const tecnico = tecnicos[certsCreados % Math.max(tecnicos.length, 1)] || admin;
    const cert = await certificadoSvc.emitir(
      {
        asignacion: asigAutorizada._id.toString(),
        fechaCalibracion: new Date(Date.now() - 5 * 86400000),
        vigencia: new Date(Date.now() + 365 * 86400000),
        servicio: { razon: "Calibración", tipo: "Acreditado", procedimiento: "PRO-CAL-023" },
        condiciones: { temperatura: 20.5, humedad: 48 },
        comentarios: "Calibración realizada dentro de los parámetros normales del laboratorio.",
        revisadoPor: tecnico._id.toString(),
        autorizadoPor: admin._id.toString(),
      },
      reqUser
    );
    await certificadoSvc.cambiarEstado(cert._id.toString(), "vigente", reqUser);
    await mongoose.model("Certificado").updateOne(
      { _id: cert._id },
      { $push: { verificaciones: { fecha: new Date(), ipHash: "demo-hash-0001", userAgent: "Mozilla/5.0 (demo)" } } }
    );
    certsCreados++;
  }
  console.log(`· ${certsCreados} certificados emitidos y puestos en vigente`);

  // ------------------------------------------------------------------
  // Performance: plantillas de puntos de prueba
  // ------------------------------------------------------------------
  if (!(await Performance.exists({ nombre: "Vernier digital 0-150 mm" }))) {
    await performanceSvc.crear(
      {
        nombre: "Vernier digital 0-150 mm",
        comentarios: "Plantilla estándar para calibradores vernier digitales de 150 mm.",
        magnitud: "Dimensional",
        tipoInstrumento: "Calibrador Vernier",
        puntos: [
          { prueba: "Punto 1", nominal: 10, unidad: "mm", escalaTotal: 150, porcentajeRdg: 0, porcentajeFs: 0.1, unidades: 0.02, incertidumbre: 0.01 },
          { prueba: "Punto 2", nominal: 50, unidad: "mm", escalaTotal: 150, porcentajeRdg: 0, porcentajeFs: 0.1, unidades: 0.02, incertidumbre: 0.01 },
          { prueba: "Punto 3", nominal: 100, unidad: "mm", escalaTotal: 150, porcentajeRdg: 0, porcentajeFs: 0.1, unidades: 0.02, incertidumbre: 0.01 },
          { prueba: "Punto 4", nominal: 150, unidad: "mm", escalaTotal: 150, porcentajeRdg: 0, porcentajeFs: 0.1, unidades: 0.02, incertidumbre: 0.01 },
        ],
      },
      admin._id.toString()
    );
    console.log("· Performance: Vernier digital 0-150 mm");
  }
  if (!(await Performance.exists({ nombre: "Manómetro digital 0-20 bar" }))) {
    await performanceSvc.crear(
      {
        nombre: "Manómetro digital 0-20 bar",
        comentarios: "Plantilla estándar para manómetros digitales de proceso.",
        magnitud: "Presion",
        tipoInstrumento: "Manómetro Digital",
        puntos: [
          { prueba: "25%", nominal: 5, unidad: "bar", escalaTotal: 20, porcentajeRdg: 0.25, porcentajeFs: 0, unidades: 0, incertidumbre: 0.01 },
          { prueba: "50%", nominal: 10, unidad: "bar", escalaTotal: 20, porcentajeRdg: 0.25, porcentajeFs: 0, unidades: 0, incertidumbre: 0.01 },
          { prueba: "75%", nominal: 15, unidad: "bar", escalaTotal: 20, porcentajeRdg: 0.25, porcentajeFs: 0, unidades: 0, incertidumbre: 0.01 },
          { prueba: "100%", nominal: 20, unidad: "bar", escalaTotal: 20, porcentajeRdg: 0.25, porcentajeFs: 0, unidades: 0, incertidumbre: 0.01 },
        ],
      },
      admin._id.toString()
    );
    console.log("· Performance: Manómetro digital 0-20 bar");
  }

  // ------------------------------------------------------------------
  // Actividades (calendario) — variedad de estados/técnicos/fechas
  // ------------------------------------------------------------------
  const hoy = new Date();
  const ACTIVIDADES = [
    { diasOffset: -3, horaInicio: "08:00", horaFin: "12:00", status: "completada", actividad: "Calibración en sitio de básculas industriales", comentarios: "Servicio realizado sin incidencias, cliente conforme." },
    { diasOffset: -1, horaInicio: "09:00", horaFin: "11:00", status: "completada", actividad: "Entrega de certificados y factura", comentarios: "Se entregó carpeta física y copia digital por correo." },
    { diasOffset: 0, horaInicio: "10:00", horaFin: "18:00", status: "en_proceso", actividad: "Calibración de vernier y micrómetros en planta", comentarios: "Faltan 3 equipos por calibrar, se retoma mañana." },
    { diasOffset: 1, horaInicio: "08:30", horaFin: "13:00", status: "pendiente", actividad: "Recolección de equipos para calibración en laboratorio", comentarios: "Confirmar con el cliente el horario de acceso a planta." },
    { diasOffset: 2, horaInicio: "09:00", horaFin: "15:00", status: "pendiente", actividad: "Calibración de manómetros y transductores de presión", comentarios: "Llevar patrón de presión PAT-DEMO-03." },
    { diasOffset: 3, horaInicio: "08:00", horaFin: "12:00", status: "pendiente", actividad: "Revisión de equipos rechazados por Calidad", comentarios: "Repetir calibración y volver a subir gráfica para autorización." },
    { diasOffset: 5, horaInicio: "10:00", horaFin: "16:00", status: "pendiente", actividad: "Calibración de termómetros digitales", comentarios: "Coordinar con el cliente el uso del baño térmico portátil." },
    { diasOffset: -7, horaInicio: "08:00", horaFin: "10:00", status: "completada", actividad: "Visita de levantamiento de equipos nuevos", comentarios: "Se registraron 4 equipos nuevos en el sistema." },
  ];
  let actsCreadas = 0;
  for (const [i, a] of ACTIVIDADES.entries()) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + a.diasOffset);
    const yaExiste = await actividadSvc.listar({ year: fecha.getFullYear(), month: fecha.getMonth() + 1 })
      .then((lista) => lista.some((x) => x.actividad === a.actividad));
    if (yaExiste) continue;
    const tecnico = tecnicos[i % Math.max(tecnicos.length, 1)] || admin;
    await actividadSvc.crear(
      {
        fechaActividad: fecha,
        fechaLimite: fecha,
        tecnico: tecnico._id,
        reporte: reportesDemo.length ? reportesDemo[i % reportesDemo.length]._id : undefined,
        horaInicio: a.horaInicio,
        horaFin: a.horaFin,
        actividad: a.actividad,
        comentarios: a.comentarios,
        status: a.status,
      },
      admin._id
    );
    actsCreadas++;
  }
  console.log(`· ${actsCreadas} actividades creadas en el calendario`);

  // ------------------------------------------------------------------
  // Cobranza / Facturas — variedad: pagada, pendiente y atrasada
  // ------------------------------------------------------------------
  let facturasCreadas = 0;
  for (const [i, c] of clientesDemo.entries()) {
    const folio = `FAC-COMPLETO-${1000 + i}`;
    if (await mongoose.model("Factura").exists({ folio })) continue;
    const monto = 8000 + i * 1500;
    const esPagada = i % 3 === 0;
    const esAtrasada = i % 3 === 1;
    const fechaCr = new Date(Date.now() - (esAtrasada ? 90 : 10) * 86400000);
    const factura = await facturaSvc.crear(
      {
        cliente: c._id.toString(),
        oc: `OC-DEMO-${4736 + i}`,
        folio,
        monto,
        fechaCr,
        diasPago: esAtrasada ? 15 : 30,
        comentarios: esPagada
          ? "Pago recibido por transferencia bancaria."
          : esAtrasada
          ? "Cliente notificado, pendiente de confirmar fecha de pago."
          : "Factura enviada, en espera de vencimiento.",
      },
      admin._id.toString()
    );
    if (esPagada) {
      await facturaSvc.aplicarPago(factura._id.toString(), new Date(Date.now() - 2 * 86400000));
    }
    facturasCreadas++;
  }
  console.log(`· ${facturasCreadas} facturas de cobranza creadas (pagadas/pendientes/atrasadas)`);

  console.log("\n────────────────────────────────────────────");
  console.log("Listo: catálogos, usuarios, clientes/contactos, equipos, patrones,");
  console.log("certificados, performance, actividades y cobranza quedaron con");
  console.log("información realista en (casi) todos sus campos.");
  console.log("────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

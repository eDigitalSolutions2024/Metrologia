/**
 * Datos de DEMO para comparar visualmente el módulo de Reportes con el PHP
 * legacy: 5 clientes con dirección/contacto completos, 5 cotizaciones, ~18
 * equipos, 2 técnicos, y 5 reportes (uno por cliente) con 3-4 asignaciones
 * cada uno cubriendo distintos estados (pendiente, completa con factura y
 * recolección, rechazada por Calidad, en proceso) para ver los selects de
 * Calibración/Entrega/Certificado y la tabla de Recolección con datos ya
 * llenos, en varios reportes distintos.
 *
 *   node scripts/seedReporteDemo.js
 *
 * Idempotente por cliente: si el RFC de un cliente demo ya existe, se salta
 * ese cliente (no duplica) y sigue con los demás.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { mongoUri } = require("../src/config/env");

const Usuario = require("../src/models/Usuario");
const Cliente = require("../src/models/Cliente");
const Contacto = require("../src/models/Contacto");
const Equipo = require("../src/models/Equipo");
const Patron = require("../src/models/Patron");

const reporteSvc = require("../src/services/reporte.service");
const asignacionSvc = require("../src/services/asignacion.service");
const cotizacionSvc = require("../src/services/cotizacion.service");

const CATEGORIA_EQUIPO = {
  "Vernier digital": "Dimensional", "Micrómetro exterior": "Dimensional", "Pin gage clase Z": "Dimensional",
  "Indicador de carátula": "Dimensional", "Manómetro digital": "Presion", "Transductor de presión": "Presion",
  "Báscula industrial": "Masa", "Juego de pesas": "Masa", "Torquímetro": "Par Torsional",
  "Multímetro digital": "Electrica", "Termómetro infrarrojo": "Temperatura", "Higrómetro": "Temperatura y Humedad",
};

const CLIENTES = [
  {
    rfc: "RSD030303RS1", nombre: "REYNOSA STEEL DE MEXICO SA DE CV", corto: "REYNOSA STEEL",
    domicilio: { calle: "Av. Industrial", numExterior: "2150", colonia: "Parque Industrial Salvarcar", municipio: "Juárez", ciudad: "Juárez", estado: "Chihuahua", cp: "32695" },
    contacto: { nombre: "Laura Méndez", telefono: "656-128-5787" },
    equipos: [
      { descripcion: "Vernier digital", marca: "Mitutoyo", modelo: "530-101" },
      { descripcion: "Micrómetro exterior", marca: "Starrett", modelo: "436.1XRL-25" },
      { descripcion: "Pin gage clase Z", marca: "Vermont", modelo: "PIN GAGE 0.0680" },
      { descripcion: "Indicador de carátula", marca: "Mitutoyo", modelo: "2046S" },
    ],
    oc: "OC-DEMO-4736",
  },
  {
    rfc: "IPJ040404IP2", nombre: "INDUSTRIAS PLASTICAS DE JUAREZ SA DE CV", corto: "INPLAJU",
    domicilio: { calle: "Blvd. Zaragoza", numExterior: "8800", colonia: "Partido Romero", municipio: "Juárez", ciudad: "Juárez", estado: "Chihuahua", cp: "32030" },
    contacto: { nombre: "Ricardo Peña", telefono: "656-234-9910" },
    equipos: [
      { descripcion: "Manómetro digital", marca: "Ashcroft", modelo: "2074" },
      { descripcion: "Transductor de presión", marca: "WIKA", modelo: "A-10" },
      { descripcion: "Báscula industrial", marca: "Rice Lake", modelo: "IQ plus 210" },
    ],
    oc: "OC-DEMO-5510",
  },
  {
    rfc: "ELN050505EL3", nombre: "ELECTRONICOS DEL NORTE SA DE CV", corto: "ELECTRONORTE",
    domicilio: { calle: "Calle 16 de Septiembre", numExterior: "310", colonia: "Centro", municipio: "Juárez", ciudad: "Juárez", estado: "Chihuahua", cp: "32000" },
    contacto: { nombre: "Ana Sofía Rubio", telefono: "656-345-1122" },
    equipos: [
      { descripcion: "Multímetro digital", marca: "Fluke", modelo: "87V" },
      { descripcion: "Torquímetro", marca: "CDI", modelo: "2503MRMH" },
      { descripcion: "Termómetro infrarrojo", marca: "Fluke", modelo: "62 MAX+" },
    ],
    oc: "OC-DEMO-6021",
  },
  {
    rfc: "AGF060606AG4", nombre: "AGROINDUSTRIAS FRONTERIZAS SA DE CV", corto: "AGROFRONT",
    domicilio: { calle: "Carretera Panamericana", numExterior: "km 12", colonia: "Valle de Juárez", municipio: "Juárez", ciudad: "Juárez", estado: "Chihuahua", cp: "32575" },
    contacto: { nombre: "Marco Villalobos", telefono: "656-456-7788" },
    equipos: [
      { descripcion: "Higrómetro", marca: "Vaisala", modelo: "HMP110" },
      { descripcion: "Báscula industrial", marca: "Ohaus", modelo: "Defender 3000" },
      { descripcion: "Termómetro infrarrojo", marca: "Testo", modelo: "830-T2" },
      { descripcion: "Juego de pesas", marca: "Rice Lake", modelo: "ASTM Class 4" },
    ],
    oc: "OC-DEMO-7340",
  },
  {
    rfc: "MTQ070707MT5", nombre: "MAQUILADORA TEXTIL QUINTANA SA DE CV", corto: "MAQTEX",
    domicilio: { calle: "Av. Tecnológico", numExterior: "4010", colonia: "Ex Hipódromo", municipio: "Juárez", ciudad: "Juárez", estado: "Chihuahua", cp: "32310" },
    contacto: { nombre: "Diana Chávez", telefono: "656-567-3344" },
    equipos: [
      { descripcion: "Vernier digital", marca: "Insize", modelo: "1108-150" },
      { descripcion: "Multímetro digital", marca: "Klein Tools", modelo: "MM700" },
      { descripcion: "Indicador de carátula", marca: "Starrett", modelo: "25-441J" },
    ],
    oc: "OC-DEMO-8115",
  },
];

async function crearEquipoCliente(cliente, spec, idx, patron, admin) {
  return Equipo.create({
    cliente: cliente._id,
    idInterno: `${cliente.corto || "EQ"}-${String(idx + 1).padStart(2, "0")}`.replace(/\s+/g, "").toUpperCase(),
    marca: spec.marca, modelo: spec.modelo, serie: `${cliente.rfc.slice(0, 4)}-${idx + 1}`,
    descripcion: spec.descripcion, categoria: CATEGORIA_EQUIPO[spec.descripcion] || "Dimensional",
    subtipo: "DIGITAL", unidades: "mm", divisionMinima: "0.001",
    patronesSugeridos: [patron._id], registradoPor: admin._id,
  });
}

async function run() {
  await mongoose.connect(mongoUri);

  const admin = await Usuario.findOne({ rol: "admin" });
  if (!admin) throw new Error("No hay usuario admin. Corre primero: npm run seed:admin");
  const reqUser = { id: admin._id.toString(), usuario: admin.usuario, rol: admin.rol };

  const passwordHashDemo = await bcrypt.hash("Demo2026!", 10);
  const tecnicosNombres = ["Técnico Demo Uno", "Técnico Demo Dos"];
  const tecnicos = [];
  for (const [i, nombre] of tecnicosNombres.entries()) {
    let t = await Usuario.findOne({ usuario: `tecnico.demo${i + 1}` });
    if (!t) {
      t = await Usuario.create({
        nombre, usuario: `tecnico.demo${i + 1}`, email: `tecnico.demo${i + 1}@example.com`,
        passwordHash: passwordHashDemo, rol: "tecnico", status: "activo",
      });
      console.log("· Técnico demo creado:", t.nombre);
    }
    tecnicos.push(t);
  }

  // Un usuario demo por cada rol restante, misma contraseña, para probar permisos.
  const OTROS_ROLES = [
    { rol: "ventas", nombre: "Ventas Demo", usuario: "ventas.demo" },
    { rol: "coordinador", nombre: "Coordinador Demo", usuario: "coordinador.demo" },
  ];
  for (const r of OTROS_ROLES) {
    const existe = await Usuario.findOne({ usuario: r.usuario });
    if (!existe) {
      await Usuario.create({
        nombre: r.nombre, usuario: r.usuario, email: `${r.usuario}@example.com`,
        passwordHash: passwordHashDemo, rol: r.rol, status: "activo",
      });
      console.log(`· Usuario demo creado: ${r.nombre} (${r.rol})`);
    }
  }

  const patron = await Patron.findOne({ codigo: "PAT-DEMO-01" }) || await Patron.create({
    codigo: "PAT-DEMO-01",
    nombre: "Juego de bloques patrón grado 1",
    categoria: "Dimensional",
    marca: "Mitutoyo", modelo: "516-950", serie: "DEMO-BP-01",
    trazabilidad: "CENAM",
    unidades: "mm", capacidad: "1–100 mm",
    incertidumbre: { valor: 0.00022, unidad: "mm", k: 2 },
    ultimaCalibracion: { fecha: new Date("2026-02-10"), vencimiento: new Date("2027-02-10"), certificadoNo: "CENAM-DEMO-2026-001", laboratorio: "CENAM" },
  });

  // Ciclo de estados que se reparte entre las asignaciones de cada reporte,
  // para que en conjunto los 5 reportes cubran todas las combinaciones.
  const ESTADOS = [
    { calibracion: null }, // pendiente, sin tocar
    { calibracion: "terminada", entrega: "entregado", certificado: "autorizado", factura: true, recoleccionCompleta: true },
    { calibracion: "terminada", certificado: "rechazado", motivo: "Falta firma del técnico en la hoja de datos originales.", recoleccionSitio: true },
    { calibracion: "en_proceso" },
  ];

  const reportesCreados = [];

  for (const [ci, c] of CLIENTES.entries()) {
    let cliente = await Cliente.findOne({ rfc: c.rfc });
    if (cliente) {
      console.log(`· Cliente "${c.nombre}" ya existe (RFC ${c.rfc}) — se omite.`);
      continue;
    }

    cliente = await Cliente.create({
      nombre: c.nombre, nombreComercial: c.corto, rfc: c.rfc, sucursal: "juarez",
      domicilioFiscal: { ...c.domicilio, pais: "México" },
      contacto: { nombre: c.contacto.nombre, telefono: c.contacto.telefono, emailCotizaciones: `compras@${c.corto.toLowerCase().replace(/\s+/g, "")}-demo.mx` },
    });
    cliente.corto = c.corto; // solo para armar idInterno arriba, no se persiste
    console.log(`· Cliente demo ${ci + 1}/5:`, cliente.nombre);

    const contacto = await Contacto.create({
      cliente: cliente._id, nombre: c.contacto.nombre, telefono: c.contacto.telefono,
      correo: `compras@${c.corto.toLowerCase().replace(/\s+/g, "")}-demo.mx`,
    });

    const equipos = [];
    for (const [i, spec] of c.equipos.entries()) {
      equipos.push(await crearEquipoCliente(cliente, spec, i, patron, admin));
    }
    console.log(`  · ${equipos.length} equipos`);

    const cotizacion = await cotizacionSvc.crear(
      {
        cliente: cliente._id.toString(),
        vigencia: new Date(Date.now() + 30 * 86400000),
        items: equipos.map((eq) => ({ descripcion: `Calibración — ${eq.descripcion} (${eq.idInterno})`, cantidad: 1, precioUnitario: 1200 + Math.round(Math.random() * 800) })),
        observaciones: "Cotización de demostración generada por seedReporteDemo.js",
      },
      admin._id.toString()
    );
    console.log("  · Cotización:", cotizacion.folio);

    const reporte = await reporteSvc.crear(
      {
        cliente: cliente._id.toString(),
        contacto: contacto._id.toString(),
        cotizacion: cotizacion._id.toString(),
        ordenCompra: c.oc,
        observaciones: "Servicio de demostración — comparar con formato legacy",
      },
      reqUser
    );
    console.log("  · Reporte:", reporte.folio);

    for (const [i, eq] of equipos.entries()) {
      const tecnico = tecnicos[i % tecnicos.length];
      const a = await asignacionSvc.crear(
        { reporte: reporte._id.toString(), equipo: eq._id.toString(), tecnicoAsignado: tecnico._id.toString(), patrones: [patron._id.toString()] },
        reqUser
      );
      const est = ESTADOS[i % ESTADOS.length];
      if (est.calibracion) {
        await asignacionSvc.cambiarEstado(a._id.toString(), { dominio: "calibracion", valor: est.calibracion }, reqUser);
      }
      if (est.entrega) await asignacionSvc.cambiarEstado(a._id.toString(), { dominio: "entrega", valor: est.entrega }, reqUser);
      if (est.certificado) {
        await asignacionSvc.cambiarEstado(a._id.toString(), { dominio: "certificado", valor: est.certificado, motivo: est.motivo }, reqUser);
      }
      const cambios = {};
      if (est.factura) cambios.factura = `FAC-DEMO-${9000 + ci * 10 + i}`;
      if (est.recoleccionCompleta) cambios.recoleccion = { enLaboratorio: true, recolectado: true, ubicacionInfo: "Recibido en recepción", infoRecoleccion: "Recolectado en la fecha del servicio" };
      if (est.recoleccionSitio) cambios.recoleccion = { enSitio: true, ubicacionInfo: "Equipo en planta, línea de producción" };
      if (Object.keys(cambios).length) await asignacionSvc.actualizar(a._id.toString(), cambios, reqUser);
    }
    console.log(`  · ${equipos.length} asignaciones creadas`);

    await reporteSvc.agregarComentario(reporte._id.toString(), "Cliente solicita entrega de certificados junto con la factura.", reqUser);

    reportesCreados.push(reporte);
  }

  console.log("\n────────────────────────────────────────────");
  if (reportesCreados.length === 0) {
    console.log("No se creó nada nuevo (todos los clientes demo ya existían).");
  } else {
    console.log(`${reportesCreados.length} reportes demo nuevos. Ábrelos en:`);
    reportesCreados.forEach((r) => console.log(`  http://localhost:5174/reportes/${r._id}`));
  }
  console.log("────────────────────────────────────────────\n");

  await mongoose.disconnect();
  console.log("Listo.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

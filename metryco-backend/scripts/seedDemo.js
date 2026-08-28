/**
 * Datos de DEMO end-to-end para ver el flujo funcionando:
 *   Cliente → Equipo → Reporte → Asignación → (calibración hecha) →
 *   Certificado (con token/QR) → Cálculo de incertidumbre (GUM).
 *
 *   node scripts/seedDemo.js
 *
 * Idempotente: si ya existe el cliente demo, no vuelve a crear todo.
 * Imprime al final la URL pública del certificado para abrirla / escanear el QR.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { mongoUri, publicWebUrl } = require("../src/config/env");

const Usuario = require("../src/models/Usuario");
const Cliente = require("../src/models/Cliente");
const Equipo = require("../src/models/Equipo");
const Patron = require("../src/models/Patron");
const Reporte = require("../src/models/Reporte");
const Asignacion = require("../src/models/Asignacion");
const Certificado = require("../src/models/Certificado");
const ModeloIncertidumbre = require("../src/models/ModeloIncertidumbre");

const reporteSvc = require("../src/services/reporte.service");
const asignacionSvc = require("../src/services/asignacion.service");
const certificadoSvc = require("../src/services/certificado.service");
const calculoSvc = require("../src/services/calculoIncertidumbre.service");

const RFC_DEMO = "DEM020202DEM";

async function run() {
  await mongoose.connect(mongoUri);

  const admin = await Usuario.findOne({ rol: "admin" });
  if (!admin) throw new Error("No hay usuario admin. Corre primero: npm run seed:admin");
  const reqUser = { id: admin._id.toString(), usuario: admin.usuario, rol: admin.rol };

  let cliente = await Cliente.findOne({ rfc: RFC_DEMO });
  if (cliente) {
    console.log("El cliente DEMO ya existe — nada que hacer. (Borra el cliente con RFC " + RFC_DEMO + " para regenerar.)");
    await mongoose.disconnect();
    return;
  }

  cliente = await Cliente.create({
    nombre: "CLIENTE DEMOSTRACIÓN SA DE CV",
    rfc: RFC_DEMO,
    sucursal: "juarez",
    contacto: { nombre: "Contacto Demo", emailCotizaciones: "demo@example.com" },
  });
  console.log("· Cliente demo:", cliente.nombre);

  const patron = await Patron.create({
    codigo: "PAT-DEMO-01",
    nombre: "Juego de bloques patrón grado 1",
    categoria: "Dimensional",
    marca: "Mitutoyo", modelo: "516-950", serie: "DEMO-BP-01",
    trazabilidad: "CENAM",
    unidades: "mm", capacidad: "1–100 mm",
    incertidumbre: { valor: 0.00022, unidad: "mm", k: 2 },
    ultimaCalibracion: {
      fecha: new Date("2026-02-10"),
      vencimiento: new Date("2027-02-10"),
      certificadoNo: "CENAM-DEMO-2026-001",
      laboratorio: "CENAM",
    },
  });
  console.log("· Patrón demo:", patron.codigo);

  const equipo = await Equipo.create({
    cliente: cliente._id,
    idInterno: "DEMO-EQ-001",
    marca: "Mitutoyo", modelo: "530-312", serie: "DEMO-VC-77",
    descripcion: "Calibrador Vernier 0–150 mm",
    categoria: "Dimensional",
    unidades: "mm", divisionMinima: "0.02", resolucion: "0.02",
    rango: "0–150 mm", rangoCalibracion: "0–150 mm",
    patronesSugeridos: [patron._id],
    registradoPor: admin._id,
  });
  console.log("· Equipo demo:", equipo.idInterno);

  const reporte = await reporteSvc.crear(
    { cliente: cliente._id.toString(), ordenCompra: "OC-DEMO-1000", observaciones: "Reporte de demostración" },
    reqUser
  );
  console.log("· Reporte:", reporte.folio);

  const asignacion = await asignacionSvc.crear(
    {
      reporte: reporte._id.toString(),
      equipo: equipo._id.toString(),
      tecnicoAsignado: admin._id.toString(),
      patrones: [patron._id.toString()],
    },
    reqUser
  );
  await asignacionSvc.cambiarEstado(
    asignacion._id.toString(),
    { dominio: "calibracion", valor: "terminada" },
    reqUser
  );
  console.log("· Asignación calibrada (técnico ejecutor registrado en historial)");

  // Cálculo de incertidumbre GUM a partir del modelo de vernier.
  const modelo = await ModeloIncertidumbre.findOne({
    magnitud: "dimensional",
    tipoInstrumento: "vernier",
  });
  let calculo = null;
  if (modelo) {
    // Valores realistas de demostración (mm) en el punto de 50 mm.
    const contribuciones = modelo.contribuciones.map((c) => {
      const o = c.toObject();
      if (/resoluci/i.test(o.fuente)) return { ...o, valor: 0.01 }; // a = 0.02/2
      if (/patr[oó]n de referencia/i.test(o.fuente)) return { ...o, valor: 0.00044, k: 2 }; // U del certificado
      if (/deriva/i.test(o.fuente)) return { ...o, valor: 0.0003 };
      if (/temperatura/i.test(o.fuente)) return { ...o, valor: 0.0025 };
      if (/planitud|geo/i.test(o.fuente)) return { ...o, valor: 0.004 };
      return { ...o, valor: o.valorSugerido || 0 };
    });
    calculo = await calculoSvc.crear(
      {
        modelo: modelo._id.toString(),
        equipo: equipo._id.toString(),
        asignacion: asignacion._id.toString(),
        patronesUsados: [patron._id.toString()],
        puntoNominal: 50,
        unidad: "mm",
        lecturas: [50.01, 50.0, 50.02, 49.99, 50.01, 50.0],
        nivelConfianza: "95.45%",
      },
      reqUser
    );
    console.log("· Cálculo incertidumbre:", calculo.folio, "→", calculo.resultado.expresion);
  }

  const cert = await certificadoSvc.emitir(
    {
      asignacion: asignacion._id.toString(),
      vigencia: new Date(Date.now() + 365 * 86400000),
      resultado: calculo
        ? {
            valorMedido: calculo.resultado.y,
            unidad: "mm",
            incertidumbreExpandida: calculo.resultado.incertidumbreExpandida,
            k: calculo.resultado.k,
            nivelConfianza: calculo.resultado.nivelConfianza,
          }
        : undefined,
    },
    reqUser
  );
  await certificadoSvc.cambiarEstado(cert._id.toString(), "vigente", reqUser);
  console.log("· Certificado:", cert.folio, "estado: vigente");

  console.log("\n────────────────────────────────────────────");
  console.log("Verificación pública (lo que codifica el QR):");
  console.log(`  ${publicWebUrl.replace(/\/$/, "")}/certificado/ver/${cert.publicToken}`);
  console.log("API pública (sin token de sesión):");
  console.log(`  GET /api/publico/certificado/${cert.publicToken}`);
  console.log(`  GET /api/publico/certificado/${cert.publicToken}/qr.png`);
  console.log("────────────────────────────────────────────\n");

  await mongoose.disconnect();
  console.log("Listo.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

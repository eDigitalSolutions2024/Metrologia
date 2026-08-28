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
const patronSvc = require("../src/services/patron.service");

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

  const patron = await patronSvc.crear(
    {
      codigo: "PAT-DEMO-01",
      nombre: "Juego de bloques patrón grado 1",
      descripcion: "Bloques patrón de acero, grado 1",
      categoria: "Dimensional",
      magnitud: "dimensional",
      marca: "Mitutoyo", modelo: "516-950", serie: "DEMO-BP-01",
      unidad: "mm",
      intervaloMedicion: "1–100 mm",
      resolucion: "—",
      incertidumbre: {
        modo: "tabla",
        k: 2,
        unidad: "mm",
        // U(L) ≈ 0.00010 + 0.0000006·L (mm)  — típico bloques grado 1
        puntos: [
          { nominal: 1, U: 0.00010 },
          { nominal: 10, U: 0.00011 },
          { nominal: 25, U: 0.00012 },
          { nominal: 50, U: 0.00013 },
        ],
      },
      deriva: { valor: 0.00005, unidad: "mm", periodoMeses: 12 },
      trazabilidad: "CENAM",
      calibracion: {
        laboratorio: "CENAM",
        numeroCertificado: "CENAM-DEMO-2026-001",
        fecha: new Date("2026-02-10"),
        periodicidadMeses: 24,
      },
      condicionesReferencia: "20 ± 1 °C, 45–55 % HR",
      manejo: "Manipular con guantes; limpiar antes de usar.",
    },
    reqUser
  );
  console.log("· Patrón demo:", patron.codigo, "vence", patron.calibracion.vencimiento.toISOString().slice(0, 10), "· vigencia:", patron.vigencia);

  const equipo = await Equipo.create({
    cliente: cliente._id,
    idInterno: "MD-17",
    marca: "Mitutoyo", modelo: "293-DIG", serie: "DEMO-MD-17",
    descripcion: "Micrometro",
    categoria: "Dimensional",
    subtipo: "DIGITAL",
    accuracy: 0.003,
    unidades: "mm", divisionMinima: "0.001", resolucion: "0.001",
    rango: "0-20.000", rangoCalibracion: "0-20.000",
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

  // Presupuestos de incertidumbre por punto, replicando el informe MET-000023433:
  // micrometro digital, 6 nominales, "como se encontro" + "como se dejo",
  // 3 lecturas iguales al nominal -> s = 0, U dominada por la resolucion.
  const modelo = await ModeloIncertidumbre.findOne({
    magnitud: "dimensional",
    tipoInstrumento: "micrometro",
    nombre: /informe MET/i,
  });
  let calculo = null;
  if (modelo) {
    // Sólo se fija la resolución del display; el patrón (U + deriva) lo inyecta
    // el motor desde PAT-DEMO-01, y la repetibilidad desde las lecturas.
    const contribuciones = modelo.contribuciones.map((c) => {
      const o = c.toObject();
      if (/resoluci/i.test(o.fuente)) return { ...o, valor: 0.0005 }; // a = 0.001/2
      return { ...o, valor: o.valorSugerido || 0 };
    });
    const NOMINALES = [1, 3, 8, 10, 15, 20];

    for (const condicion of ["encontrado", "dejado"]) {
      for (const n of NOMINALES) {
        const c = await calculoSvc.crear(
          {
            modelo: modelo._id.toString(),
            equipo: equipo._id.toString(),
            asignacion: asignacion._id.toString(),
            patronesUsados: [patron._id.toString()],
            puntoNominal: n,
            unidad: "mm",
            emp: 0.003,
            condicion,
            lecturas: [n, n, n],
            contribuciones,
            nivelConfianza: "95.45%",
          },
          reqUser
        );
        await calculoSvc.revisar(c._id.toString(), reqUser);
        await calculoSvc.aprobar(c._id.toString(), reqUser);
        calculo = c;
      }
    }
    console.log(`· ${NOMINALES.length * 2} cálculos de incertidumbre (encontrado+dejado) → U ≈ ${calculo.resultado.incertidumbreExpandida.toExponential(1)} mm`);
  }

  // Sin `resultado` explícito: el certificado lo arma con los puntos aprobados.
  const cert = await certificadoSvc.emitir(
    {
      asignacion: asignacion._id.toString(),
      vigencia: new Date(Date.now() + 365 * 86400000),
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

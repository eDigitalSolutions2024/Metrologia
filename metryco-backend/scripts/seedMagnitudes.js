// Catálogo de Magnitudes + tipos de instrumento, alineado con las categorías
// reales que ya usan Equipo/Patrón (metryco-laboratorio/src/pages/Equipos/categorias.js).
// Sin este catálogo el selector "Magnitud" de Análisis de Incertidumbre queda
// vacío y las plantillas (ModeloIncertidumbre) son inalcanzables desde la UI.
require("dotenv/config");
const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");
const Magnitud = require("../src/models/Magnitud");

const catalogo = [
  {
    clave: "dimensional", nombre: "Dimensional", simbolo: "L", unidadSI: "m", orden: 1,
    descripcion: "Longitudes, ángulos y geometría dimensional.",
    tipos: [
      { clave: "micrometro", nombre: "Micrómetro", unidadSugerida: "mm" },
      { clave: "vernier", nombre: "Calibrador Vernier", unidadSugerida: "mm" },
      { clave: "indicador_caratula", nombre: "Indicador de carátula (reloj comparador)", unidadSugerida: "mm" },
      { clave: "flexometro", nombre: "Flexómetro / cinta métrica", unidadSugerida: "m" },
    ],
  },
  {
    clave: "masa", nombre: "Masa", simbolo: "m", unidadSI: "kg", orden: 2,
    descripcion: "Básculas y balanzas de pesaje.",
    tipos: [
      { clave: "bascula", nombre: "Báscula de plataforma", unidadSugerida: "kg" },
      { clave: "balanza_analitica", nombre: "Balanza analítica", unidadSugerida: "g" },
    ],
  },
  {
    clave: "temperatura", nombre: "Temperatura", simbolo: "T", unidadSI: "K", orden: 3,
    descripcion: "Instrumentos de medición de temperatura.",
    tipos: [
      { clave: "termometro_digital", nombre: "Termómetro digital", unidadSugerida: "°C" },
      { clave: "termopar", nombre: "Termopar / termómetro de sonda", unidadSugerida: "°C" },
    ],
  },
  {
    clave: "presion", nombre: "Presión", simbolo: "p", unidadSI: "Pa", orden: 4,
    descripcion: "Manómetros y transductores de presión.",
    tipos: [
      { clave: "manometro", nombre: "Manómetro de carátula", unidadSugerida: "bar" },
      { clave: "transductor_presion", nombre: "Transductor / transmisor de presión", unidadSugerida: "bar" },
    ],
  },
  {
    clave: "fuerza", nombre: "Fuerza", simbolo: "F", unidadSI: "N", orden: 5,
    descripcion: "Celdas de carga y dinamómetros.",
    tipos: [{ clave: "celda_carga", nombre: "Celda de carga", unidadSugerida: "kN" }],
  },
  {
    clave: "par_torsional", nombre: "Par Torsional", simbolo: "M", unidadSI: "N·m", orden: 6,
    descripcion: "Llaves y multiplicadores de torque.",
    tipos: [{ clave: "llave_torque", nombre: "Llave de torque", unidadSugerida: "N·m" }],
  },
  {
    clave: "volumen", nombre: "Volumen", simbolo: "V", unidadSI: "m³", orden: 7,
    descripcion: "Material volumétrico de laboratorio.",
    tipos: [{ clave: "probeta", nombre: "Probeta / material volumétrico", unidadSugerida: "mL" }],
  },
  {
    clave: "electrica", nombre: "Eléctrica", simbolo: "U/I", unidadSI: "V/A", orden: 8,
    descripcion: "Instrumentos de medición eléctrica.",
    tipos: [{ clave: "multimetro", nombre: "Multímetro digital", unidadSugerida: "V" }],
  },
  {
    clave: "mecanica", nombre: "Mecánica", orden: 9,
    tipos: [{ clave: "durometro", nombre: "Durómetro", unidadSugerida: "HRC" }],
  },
  {
    clave: "flujo", nombre: "Flujo", simbolo: "Q", unidadSI: "m³/s", orden: 10,
    tipos: [{ clave: "flujometro", nombre: "Flujómetro", unidadSugerida: "L/min" }],
  },
  {
    clave: "peso", nombre: "Peso", orden: 11,
    tipos: [{ clave: "pesa_patron", nombre: "Pesa patrón", unidadSugerida: "kg" }],
  },
  {
    clave: "ph", nombre: "PH", orden: 12,
    tipos: [{ clave: "phmetro", nombre: "pHmetro", unidadSugerida: "pH" }],
  },
  {
    clave: "temperatura y humedad", nombre: "Temperatura y Humedad", orden: 13,
    tipos: [{ clave: "termohigrometro", nombre: "Termohigrómetro", unidadSugerida: "%HR" }],
  },
];

async function run() {
  await mongoose.connect(mongoUri);
  let creadas = 0, actualizadas = 0;
  for (const m of catalogo) {
    const res = await Magnitud.findOneAndUpdate({ clave: m.clave }, m, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (res) actualizadas++;
  }
  console.log(`Catálogo de magnitudes: ${catalogo.length} entradas aseguradas (creadas o actualizadas).`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });

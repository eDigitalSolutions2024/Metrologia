// Realinea las plantillas sembradas antes (con claves acentuadas inventadas)
// a las claves reales del catálogo de Magnitudes (scripts/seedMagnitudes.js),
// y agrega plantillas adicionales para ampliar la cobertura por categoría.
require("dotenv/config");
const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");
const ModeloIncertidumbre = require("../src/models/ModeloIncertidumbre");
const Usuario = require("../src/models/Usuario");

const RENOMBRES = [
  { magnitud: "longitud", tipoInstrumento: "micrómetro", nuevaMagnitud: "dimensional", nuevoTipo: "micrometro" },
  { magnitud: "longitud", tipoInstrumento: "vernier", nuevaMagnitud: "dimensional", nuevoTipo: "vernier" },
  { magnitud: "masa", tipoInstrumento: "báscula", nuevaMagnitud: "masa", nuevoTipo: "bascula" },
  { magnitud: "temperatura", tipoInstrumento: "termómetro digital", nuevaMagnitud: "temperatura", nuevoTipo: "termometro_digital" },
  { magnitud: "presión", tipoInstrumento: "manómetro", nuevaMagnitud: "presion", nuevoTipo: "manometro" },
];

const nuevas = [
  {
    magnitud: "fuerza", tipoInstrumento: "celda_carga",
    nombre: "Celda de carga 0-50 kN",
    mensurando: "Fuerza", unidad: "kN",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02", nivelConfianza: "95.45%",
    rangoTipico: "0-50 kN",
    notas: "Calibración en máquina universal contra celda de referencia trazable a CENAM.",
    activo: true,
    criterioAceptacion: { emp: 0.5, regla: "guard_band_U" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.04, k: 2, n: 6, gradosLibertad: 5, unidad: "kN", coefSensibilidad: 1, ayuda: "Desviación estándar de 6 aplicaciones de la misma carga nominal.", obligatoria: true },
      { fuente: "Certificado de la celda de referencia", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.02, k: 2, unidad: "kN", coefSensibilidad: 1, ayuda: "U y k del certificado vigente de la celda patrón usada como referencia.", obligatoria: true },
      { fuente: "Resolución del indicador", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.05, divisorManual: 1.7320508, unidad: "kN", coefSensibilidad: 1, ayuda: "Mitad de la resolución del indicador digital (0.1 kN).", obligatoria: true },
      { fuente: "Alineación y excentricidad de carga", simbolo: "u(alin)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.03, unidad: "kN", coefSensibilidad: 1, ayuda: "Efecto de desalineación del eje de aplicación de carga.", obligatoria: false },
    ],
  },
  {
    magnitud: "par_torsional", tipoInstrumento: "llave_torque",
    nombre: "Llave de torque 20-200 N·m",
    mensurando: "Par torsional", unidad: "N·m",
    normaReferencia: "JCGM 100:2008 (GUM); ISO 6789", nivelConfianza: "95.45%",
    rangoTipico: "20-200 N·m",
    notas: "Calibración en banco de torque contra transductor de referencia, ciclo en sentido horario.",
    activo: true,
    criterioAceptacion: { emp: 4, regla: "simple" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.8, k: 2, n: 5, gradosLibertad: 4, unidad: "N·m", coefSensibilidad: 1, ayuda: "Desviación estándar de 5 aplicaciones consecutivas.", obligatoria: true },
      { fuente: "Certificado del transductor de referencia", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.4, k: 2, unidad: "N·m", coefSensibilidad: 1, ayuda: "U y k del certificado vigente del transductor patrón del banco.", obligatoria: true },
      { fuente: "Resolución del instrumento", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.5, divisorManual: 1.7320508, unidad: "N·m", coefSensibilidad: 1, ayuda: "Mitad de la división mínima de la escala.", obligatoria: true },
      { fuente: "Velocidad de aplicación del torque", simbolo: "u(vel)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.3, unidad: "N·m", coefSensibilidad: 1, ayuda: "Variación por diferencia de velocidad de accionamiento respecto al operador de referencia.", obligatoria: false },
    ],
  },
  {
    magnitud: "electrica", tipoInstrumento: "multimetro",
    nombre: "Multímetro digital — rango de voltaje DC 0-1000 V",
    mensurando: "Voltaje DC", unidad: "V",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02", nivelConfianza: "95.45%",
    rangoTipico: "0-1000 V DC",
    notas: "Calibración contra calibrador multifunción trazable, en los puntos 10%, 50% y 90% del rango.",
    activo: true,
    criterioAceptacion: { emp: 1.2, regla: "guard_band_2U" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.08, k: 2, n: 10, gradosLibertad: 9, unidad: "V", coefSensibilidad: 1, ayuda: "Desviación estándar de 10 lecturas en el mismo punto de calibración.", obligatoria: true },
      { fuente: "Certificado del calibrador multifunción", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.05, k: 2, unidad: "V", coefSensibilidad: 1, ayuda: "Incertidumbre expandida del certificado del calibrador patrón usado como fuente.", obligatoria: true },
      { fuente: "Resolución del display", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.1, divisorManual: 1.7320508, unidad: "V", coefSensibilidad: 1, ayuda: "Mitad del último dígito del display digital.", obligatoria: true },
      { fuente: "Deriva del instrumento entre calibraciones", simbolo: "u(deriva)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.06, unidad: "V", coefSensibilidad: 1, ayuda: "Estimada a partir del historial de calibraciones previas del mismo equipo.", obligatoria: false },
    ],
  },
];

async function run() {
  await mongoose.connect(mongoUri);
  const admin = await Usuario.findOne({ rol: "admin" });

  let renombradas = 0;
  for (const r of RENOMBRES) {
    const res = await ModeloIncertidumbre.updateOne(
      { magnitud: r.magnitud, tipoInstrumento: r.tipoInstrumento },
      { $set: { magnitud: r.nuevaMagnitud, tipoInstrumento: r.nuevoTipo } }
    );
    if (res.modifiedCount) renombradas++;
  }
  console.log(`Plantillas realineadas al catálogo real: ${renombradas}`);

  let creadas = 0, existentes = 0;
  for (const p of nuevas) {
    const yaExiste = await ModeloIncertidumbre.findOne({ magnitud: p.magnitud, tipoInstrumento: p.tipoInstrumento, nombre: p.nombre });
    if (yaExiste) { existentes++; continue; }
    await ModeloIncertidumbre.create({ ...p, creadoPor: admin?._id });
    creadas++;
  }
  console.log(`Plantillas nuevas creadas: ${creadas}, ya existentes (omitidas): ${existentes}`);

  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });

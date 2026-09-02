// Seed de datos ficticios REALISTAS para probar la pantalla de administración
// de Plantillas de Incertidumbre end-to-end (crea varias magnitud->tipoInstrumento
// completas, con todos los campos llenos, vía la API real — no inserción directa
// a Mongo — para ejercitar también la validación Zod de las rutas).
require("dotenv/config");
const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");
const ModeloIncertidumbre = require("../src/models/ModeloIncertidumbre");
const Usuario = require("../src/models/Usuario");

const plantillas = [
  {
    magnitud: "longitud",
    tipoInstrumento: "micrómetro",
    nombre: "Micrómetro exterior 0-25 mm",
    mensurando: "Longitud exterior",
    unidad: "mm",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02",
    nivelConfianza: "95.45%",
    rangoTipico: "0-25 mm",
    notas: "Plantilla estándar para micrómetros de exteriores calibrados contra bloques patrón grado 1.",
    activo: true,
    criterioAceptacion: { emp: 0.004, regla: "guard_band_U" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.0008, k: 2, n: 10, coefSensibilidad: 1, gradosLibertad: 9, unidad: "mm", ayuda: "Desviación estándar de 10 lecturas repetidas en el mismo punto.", obligatoria: true },
      { fuente: "Certificado de calibración del bloque patrón", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.0005, k: 2, coefSensibilidad: 1, unidad: "mm", ayuda: "Tomar la incertidumbre expandida U y k del certificado vigente del patrón.", obligatoria: true },
      { fuente: "Resolución del instrumento", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.0005, divisorManual: 1.7320508, coefSensibilidad: 1, unidad: "mm", ayuda: "Mitad de la división mínima del instrumento (0.001 mm).", obligatoria: true },
      { fuente: "Deriva térmica (dilatación diferencial)", simbolo: "u(temp)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.0003, coefSensibilidad: 1, unidad: "mm", ayuda: "Estimar con el coeficiente de dilatación del acero (11.5 µm/m·°C) y ΔT del ambiente no controlado.", obligatoria: false },
      { fuente: "Fuerza de medición / planitud de caras", simbolo: "u(fza)", tipo: "B", modo: "semiamplitud", distribucion: "triangular", valorSugerido: 0.0002, coefSensibilidad: 1, unidad: "mm", ayuda: "Variación por presión de contacto del trinquete.", obligatoria: false },
    ],
  },
  {
    magnitud: "longitud",
    tipoInstrumento: "vernier",
    nombre: "Calibrador vernier 0-150 mm",
    mensurando: "Longitud exterior/interior/profundidad",
    unidad: "mm",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02",
    nivelConfianza: "95.45%",
    rangoTipico: "0-150 mm",
    notas: "Aplica a calibradores tipo vernier, de carátula y digitales de 150 mm con división de 0.02 mm.",
    activo: true,
    criterioAceptacion: { emp: 0.02, regla: "simple" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.004, k: 2, n: 10, coefSensibilidad: 1, gradosLibertad: 9, unidad: "mm", ayuda: "Desviación estándar de 10 mediciones repetidas.", obligatoria: true },
      { fuente: "Certificado de calibración del bloque patrón", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.0015, k: 2, unidad: "mm", coefSensibilidad: 1, ayuda: "Incertidumbre expandida del certificado del juego de bloques usado.", obligatoria: true },
      { fuente: "Resolución del instrumento", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.01, divisorManual: 1.7320508, unidad: "mm", coefSensibilidad: 1, ayuda: "Mitad de la división mínima (0.02 mm).", obligatoria: true },
      { fuente: "Paralelismo y planitud de las mordazas", simbolo: "u(par)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.003, unidad: "mm", coefSensibilidad: 1, ayuda: "Estimación por desgaste típico de mordazas en uso.", obligatoria: false },
    ],
  },
  {
    magnitud: "masa",
    tipoInstrumento: "báscula",
    nombre: "Báscula electrónica de plataforma 0-500 kg",
    mensurando: "Masa",
    unidad: "kg",
    normaReferencia: "JCGM 100:2008 (GUM); OIML R76",
    nivelConfianza: "95.45%",
    rangoTipico: "0-500 kg",
    notas: "Requiere pesas patrón clase M1 o superior, trazables, para la verificación en al menos 3 puntos del rango.",
    activo: true,
    criterioAceptacion: { emp: 0.25, regla: "guard_band_2U" },
    contribuciones: [
      { fuente: "Repetibilidad de indicaciones", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.03, k: 2, n: 6, gradosLibertad: 5, unidad: "kg", coefSensibilidad: 1, ayuda: "Desviación estándar de 6 repeticiones con la misma pesa patrón.", obligatoria: true },
      { fuente: "Certificado de las pesas patrón", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.015, k: 2, unidad: "kg", coefSensibilidad: 1, ayuda: "Tomar U y k del certificado vigente del juego de pesas patrón.", obligatoria: true },
      { fuente: "Resolución del indicador digital", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.05, divisorManual: 1.7320508, unidad: "kg", coefSensibilidad: 1, ayuda: "Mitad del dígito de resolución (0.1 kg).", obligatoria: true },
      { fuente: "Excentricidad de la plataforma", simbolo: "u(exc)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.04, unidad: "kg", coefSensibilidad: 1, ayuda: "Variación observada al desplazar la carga entre los 4 cuadrantes de la plataforma.", obligatoria: false },
      { fuente: "Empuje de aire / condiciones ambientales", simbolo: "u(amb)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.01, unidad: "kg", coefSensibilidad: 1, ayuda: "Efecto de flotabilidad, normalmente despreciable en básculas industriales.", obligatoria: false },
    ],
  },
  {
    magnitud: "temperatura",
    tipoInstrumento: "termómetro digital",
    nombre: "Termómetro digital tipo sonda -20 a 150 °C",
    mensurando: "Temperatura",
    unidad: "°C",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02",
    nivelConfianza: "95.45%",
    rangoTipico: "-20 a 150 °C",
    notas: "Calibración por comparación en baño térmico contra termómetro patrón de referencia.",
    activo: true,
    criterioAceptacion: { emp: 0.5, regla: "simple" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.05, k: 2, n: 8, gradosLibertad: 7, unidad: "°C", coefSensibilidad: 1, ayuda: "Desviación estándar de 8 lecturas en el punto de calibración, con el baño estabilizado.", obligatoria: true },
      { fuente: "Certificado del termómetro patrón", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.03, k: 2, unidad: "°C", coefSensibilidad: 1, ayuda: "Incertidumbre expandida U y k reportados en el certificado del patrón de referencia.", obligatoria: true },
      { fuente: "Resolución del instrumento bajo calibración", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.05, divisorManual: 1.7320508, unidad: "°C", coefSensibilidad: 1, ayuda: "Mitad de la resolución del display (0.1 °C).", obligatoria: true },
      { fuente: "Estabilidad y homogeneidad del baño térmico", simbolo: "u(bano)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.04, unidad: "°C", coefSensibilidad: 1, ayuda: "Variación espacial/temporal medida con el termómetro de control del baño.", obligatoria: false },
      { fuente: "Efecto de inmersión / conducción del vástago", simbolo: "u(inm)", tipo: "B", modo: "semiamplitud", distribucion: "triangular", valorSugerido: 0.02, unidad: "°C", coefSensibilidad: 1, ayuda: "Aplica cuando la profundidad de inmersión es menor a la recomendada por el fabricante.", obligatoria: false },
    ],
  },
  {
    magnitud: "presión",
    tipoInstrumento: "manómetro",
    nombre: "Manómetro de carátula 0-16 bar",
    mensurando: "Presión manométrica",
    unidad: "bar",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02",
    nivelConfianza: "95.45%",
    rangoTipico: "0-16 bar",
    notas: "Calibración por comparación directa contra balanza de peso muerto o manómetro patrón digital.",
    activo: true,
    criterioAceptacion: { emp: 0.16, regla: "guard_band_U" },
    contribuciones: [
      { fuente: "Repetibilidad de lecturas", simbolo: "u(rep)", tipo: "A", modo: "desviacion_std", distribucion: "normal", valorSugerido: 0.015, k: 2, n: 5, gradosLibertad: 4, unidad: "bar", coefSensibilidad: 1, ayuda: "Desviación estándar de 5 ciclos de subida/bajada en el mismo punto.", obligatoria: true },
      { fuente: "Certificado del patrón de presión", simbolo: "u(cert)", tipo: "B", modo: "certificado", distribucion: "normal", valorSugerido: 0.008, k: 2, unidad: "bar", coefSensibilidad: 1, ayuda: "U y k del certificado vigente de la balanza de peso muerto o manómetro patrón.", obligatoria: true },
      { fuente: "Resolución del instrumento", simbolo: "u(res)", tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0.05, divisorManual: 1.7320508, unidad: "bar", coefSensibilidad: 1, ayuda: "Mitad de la división mínima de la carátula (0.1 bar).", obligatoria: true },
      { fuente: "Histéresis (subida vs. bajada)", simbolo: "u(hist)", tipo: "B", modo: "semiamplitud", distribucion: "triangular", valorSugerido: 0.03, unidad: "bar", coefSensibilidad: 1, ayuda: "Diferencia observada entre lectura en rampa ascendente y descendente.", obligatoria: false },
    ],
  },
];

async function run() {
  await mongoose.connect(mongoUri);
  const admin = await Usuario.findOne({ rol: "admin" });

  let creadas = 0, existentes = 0;
  for (const p of plantillas) {
    const yaExiste = await ModeloIncertidumbre.findOne({ magnitud: p.magnitud, tipoInstrumento: p.tipoInstrumento, nombre: p.nombre });
    if (yaExiste) { existentes++; continue; }
    await ModeloIncertidumbre.create({ ...p, creadoPor: admin?._id });
    creadas++;
  }
  console.log(`Plantillas creadas: ${creadas}, ya existentes (omitidas): ${existentes}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });

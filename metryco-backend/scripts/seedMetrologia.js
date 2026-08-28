/**
 * Siembra los CATÁLOGOS de metrología:
 *   - Magnitudes y sus tipos de instrumento (vernier, micrómetro, ...).
 *   - Modelos (plantillas) de presupuesto de incertidumbre por magnitud+tipo,
 *     con la estructura de componentes GUM habitual. Los VALORES quedan en 0 /
 *     sugeridos: los captura el técnico en cada cálculo. Nada aquí es un número
 *     "oficial" del laboratorio — son plantillas de arranque.
 *
 *   node scripts/seedMetrologia.js            (idempotente: no duplica)
 *   node scripts/seedMetrologia.js --reset    (borra modelos/magnitudes y recrea)
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");
const Magnitud = require("../src/models/Magnitud");
const ModeloIncertidumbre = require("../src/models/ModeloIncertidumbre");

const RESET = process.argv.includes("--reset");

/* ------------------------------------------------------------------ */
/*  MAGNITUDES + TIPOS DE INSTRUMENTO                                  */
/* ------------------------------------------------------------------ */
const MAGNITUDES = [
  {
    clave: "dimensional", nombre: "Dimensional", simbolo: "L", unidadSI: "m", orden: 1,
    descripcion: "Longitud, diámetro, espesor, ángulo.",
    tipos: [
      { clave: "vernier", nombre: "Calibrador Vernier", unidadSugerida: "mm" },
      { clave: "micrometro", nombre: "Micrómetro de Exteriores", unidadSugerida: "mm" },
      { clave: "indicador_caratula", nombre: "Indicador de Carátula", unidadSugerida: "mm" },
      { clave: "bloque_patron", nombre: "Bloque Patrón", unidadSugerida: "mm" },
      { clave: "flexometro", nombre: "Flexómetro / Cinta métrica", unidadSugerida: "mm" },
      { clave: "altimetro", nombre: "Calibrador de Altura", unidadSugerida: "mm" },
    ],
  },
  {
    clave: "masa", nombre: "Masa", simbolo: "m", unidadSI: "kg", orden: 2,
    descripcion: "Balanzas, básculas y juegos de pesas.",
    tipos: [
      { clave: "balanza_analitica", nombre: "Balanza Analítica", unidadSugerida: "g" },
      { clave: "balanza_industrial", nombre: "Balanza / Báscula Industrial", unidadSugerida: "kg" },
      { clave: "juego_pesas", nombre: "Juego de Pesas", unidadSugerida: "g" },
    ],
  },
  {
    clave: "presion", nombre: "Presión", simbolo: "p", unidadSI: "Pa", orden: 3,
    descripcion: "Manómetros, vacuómetros, transductores y calibradores de presión.",
    tipos: [
      { clave: "manometro_analogico", nombre: "Manómetro Analógico", unidadSugerida: "bar" },
      { clave: "manometro_digital", nombre: "Manómetro Digital", unidadSugerida: "bar" },
      { clave: "transductor_presion", nombre: "Transductor de Presión", unidadSugerida: "kPa" },
      { clave: "vacuometro", nombre: "Vacuómetro", unidadSugerida: "kPa" },
    ],
  },
  {
    clave: "temperatura", nombre: "Temperatura", simbolo: "T", unidadSI: "K", orden: 4,
    descripcion: "Termómetros, termopares, RTD, termohigrómetros, baños y hornos.",
    tipos: [
      { clave: "termometro_digital", nombre: "Termómetro Digital (RTD/PT100)", unidadSugerida: "°C" },
      { clave: "termopar", nombre: "Termopar", unidadSugerida: "°C" },
      { clave: "termometro_liquido", nombre: "Termómetro de Líquido en Vidrio", unidadSugerida: "°C" },
      { clave: "termohigrometro", nombre: "Termohigrómetro", unidadSugerida: "°C" },
      { clave: "bano_termostatico", nombre: "Baño Termostático / Horno", unidadSugerida: "°C" },
    ],
  },
  {
    clave: "electrica", nombre: "Eléctrica", simbolo: "V", unidadSI: "V", orden: 5,
    descripcion: "Multímetros, calibradores multifunción, fuentes, pinzas.",
    tipos: [
      { clave: "multimetro_digital", nombre: "Multímetro Digital", unidadSugerida: "V" },
      { clave: "calibrador_multifuncion", nombre: "Calibrador Multifunción", unidadSugerida: "V" },
      { clave: "fuente_dc", nombre: "Fuente de Alimentación DC", unidadSugerida: "V" },
      { clave: "pinza_amperimetrica", nombre: "Pinza Amperimétrica", unidadSugerida: "A" },
    ],
  },
  {
    clave: "fuerza", nombre: "Fuerza", simbolo: "F", unidadSI: "N", orden: 6,
    descripcion: "Dinamómetros, celdas de carga, máquinas universales.",
    tipos: [
      { clave: "dinamometro", nombre: "Dinamómetro", unidadSugerida: "N" },
      { clave: "celda_carga", nombre: "Celda de Carga", unidadSugerida: "N" },
    ],
  },
  {
    clave: "par_torsional", nombre: "Par Torsional", simbolo: "M", unidadSI: "N·m", orden: 7,
    descripcion: "Torquímetros y llaves de torque.",
    tipos: [
      { clave: "torquimetro", nombre: "Torquímetro", unidadSugerida: "N·m" },
      { clave: "llave_torque", nombre: "Llave de Torque", unidadSugerida: "N·m" },
    ],
  },
  {
    clave: "volumen", nombre: "Volumen", simbolo: "V", unidadSI: "m³", orden: 8,
    descripcion: "Material volumétrico y micropipetas.",
    tipos: [
      { clave: "micropipeta", nombre: "Micropipeta", unidadSugerida: "µL" },
      { clave: "material_volumetrico", nombre: "Matraz / Pipeta / Bureta", unidadSugerida: "mL" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  HELPERS PARA COMPONENTES DE INCERTIDUMBRE                          */
/* ------------------------------------------------------------------ */
const resolucion = (u, ayuda) => ({
  fuente: "Resolución del instrumento", simbolo: "δx_res", tipo: "B",
  modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: u,
  obligatoria: true,
  ayuda: ayuda || "Semiamplitud a = resolución/2. Distribución rectangular (divisor √3).",
});
const repetibilidad = (u) => ({
  fuente: "Repetibilidad (tipo A)", simbolo: "s(q̄)", tipo: "A",
  modo: "desviacion_std", distribucion: "normal", valorSugerido: 0, n: 5, unidad: u,
  obligatoria: true,
  ayuda: "Toma ≥5 lecturas del mismo punto; el sistema calcula u = s/√n (ν = n−1). Si registras las lecturas, se llena solo.",
});
const certPatron = (u, texto) => ({
  fuente: "Incertidumbre del patrón de referencia", simbolo: "U_patron", tipo: "B",
  modo: "certificado", distribucion: "normal", valorSugerido: 0, k: 2, unidad: u,
  obligatoria: true,
  ayuda: texto || "Del certificado de calibración del patrón: se captura U y su k; u = U/k.",
});
const derivaPatron = (u) => ({
  fuente: "Deriva del patrón entre calibraciones", simbolo: "δx_der", tipo: "B",
  modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: u,
  ayuda: "Cambio máximo observado del patrón entre dos calibraciones (semiamplitud).",
});
const temperatura = (u, texto) => ({
  fuente: "Efecto de temperatura", simbolo: "δx_T", tipo: "B",
  modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: u,
  ayuda: texto || "Desviación respecto a 20 °C y diferencia de coeficientes de dilatación (α·ΔT·L).",
});

const MODELOS = [
  {
    magnitud: "dimensional", tipoInstrumento: "vernier",
    nombre: "Calibrador Vernier — error de indicación",
    mensurando: "Error de indicación del calibrador en cada punto de calibración",
    unidad: "mm",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02; CENAM (dimensional)",
    contribuciones: [
      resolucion("mm", "Vernier típico: resolución 0,01 o 0,02 mm → a = res/2."),
      repetibilidad("mm"),
      certPatron("mm", "Certificado del juego de bloques patrón (o patrón escalonado) usado."),
      derivaPatron("mm"),
      temperatura("mm", "α_acero ≈ 11,5×10⁻⁶ /°C. Contribución ≈ L·Δα·ΔT + L·α·ΔT_dif."),
      {
        fuente: "Planitud/paralelismo de topes y fuerza de medición", simbolo: "δx_geo",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "mm",
        ayuda: "Error geométrico de las caras de medición y efecto Abbe. De la especificación o verificación del instrumento.",
      },
    ],
    notas: "Presupuesto de arranque. Sustituye los valores 0 por los datos reales del laboratorio (certificado del patrón, resolución, lecturas, condiciones ambientales).",
  },
  {
    magnitud: "dimensional", tipoInstrumento: "micrometro",
    nombre: "Micrómetro de exteriores — error de indicación",
    mensurando: "Error de indicación del micrómetro en cada punto de calibración",
    unidad: "mm",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02; EURAMET cg-2",
    contribuciones: [
      resolucion("mm", "Micrómetro analógico 0,01 mm / con nonio 0,001 mm → a = res/2."),
      repetibilidad("mm"),
      certPatron("mm", "Certificado de los bloques patrón grado 0/1 utilizados."),
      derivaPatron("mm"),
      temperatura("mm"),
      {
        fuente: "Error de planitud y paralelismo de topes", simbolo: "δx_plan",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "mm",
        ayuda: "Interferómetro / vidrios ópticos planos: planitud de cada tope y paralelismo entre topes.",
      },
      {
        fuente: "Fuerza de medición (trinquete)", simbolo: "δx_F",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "mm",
        ayuda: "Deformación por diferencia de fuerza entre calibración del patrón y medición.",
      },
    ],
  },
  {
    magnitud: "masa", tipoInstrumento: "balanza_analitica",
    nombre: "Balanza analítica — error de indicación",
    mensurando: "Error de indicación de la balanza en cada carga de calibración",
    unidad: "g",
    normaReferencia: "JCGM 100:2008 (GUM); OIML R76 / EURAMET cg-18",
    contribuciones: [
      resolucion("g", "d = división de escala real. a = d/2 (rectangular). Considera 2 divisiones si aplica redondeo doble."),
      repetibilidad("g"),
      certPatron("g", "Certificado del juego de pesas patrón (clase E2/F1) usado en el punto."),
      derivaPatron("g"),
      {
        fuente: "Excentricidad (error de esquina)", simbolo: "δm_exc",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "g",
        ayuda: "Máxima diferencia al colocar la carga fuera del centro del plato.",
      },
      {
        fuente: "Empuje del aire (si no se corrige)", simbolo: "δm_aire",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "g",
        ayuda: "≈ (ρ_aire)(1/ρ_obj − 1/ρ_pesa)·m. Si densidad del objeto es desconocida, acótalo.",
      },
      {
        fuente: "Deriva / inestabilidad durante la lectura", simbolo: "δm_est",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "g",
        ayuda: "Variación de la indicación en la ventana de tiempo de lectura (corrientes de aire, temperatura).",
      },
    ],
  },
  {
    magnitud: "presion", tipoInstrumento: "manometro_digital",
    nombre: "Manómetro digital — error de indicación",
    mensurando: "Error de indicación del manómetro en cada punto de calibración",
    unidad: "bar",
    normaReferencia: "JCGM 100:2008 (GUM); EURAMET cg-17 / DKD-R 6-1",
    contribuciones: [
      resolucion("bar"),
      repetibilidad("bar"),
      certPatron("bar", "Certificado del calibrador de presión / balanza de pesos muertos patrón."),
      derivaPatron("bar"),
      {
        fuente: "Histéresis", simbolo: "δp_hist",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "bar",
        ayuda: "Diferencia máxima entre ciclo ascendente y descendente en el mismo punto.",
      },
      {
        fuente: "Diferencia de altura (cabeza hidrostática)", simbolo: "δp_h",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "bar",
        ayuda: "Δp = ρ·g·Δh entre el plano de referencia del patrón y el del instrumento.",
      },
      temperatura("bar", "Coeficiente de temperatura del patrón/transductor × desviación respecto a la temperatura de referencia."),
    ],
  },
  {
    magnitud: "temperatura", tipoInstrumento: "termometro_digital",
    nombre: "Termómetro digital (RTD/PT100) — error de indicación",
    mensurando: "Error de indicación del termómetro en cada punto de calibración",
    unidad: "°C",
    normaReferencia: "JCGM 100:2008 (GUM); EURAMET cg-8 / cg-13",
    contribuciones: [
      resolucion("°C"),
      repetibilidad("°C"),
      certPatron("°C", "Certificado del termómetro patrón (SPRT / PRT patrón) en el punto."),
      derivaPatron("°C"),
      {
        fuente: "Estabilidad del medio (baño/horno)", simbolo: "δT_est",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "°C",
        ayuda: "Fluctuación temporal de la temperatura del medio durante la medición.",
      },
      {
        fuente: "Homogeneidad del medio (gradientes)", simbolo: "δT_hom",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "°C",
        ayuda: "Diferencia de temperatura entre la posición del patrón y la del instrumento bajo prueba.",
      },
      {
        fuente: "Histéresis / autocalentamiento", simbolo: "δT_sh",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "°C",
        ayuda: "Efecto de la corriente de medición del sensor y de la histéresis térmica.",
      },
    ],
  },
  {
    magnitud: "electrica", tipoInstrumento: "multimetro_digital",
    nombre: "Multímetro digital — error de indicación (tensión DC)",
    mensurando: "Error de indicación del multímetro en cada punto de calibración",
    unidad: "V",
    normaReferencia: "JCGM 100:2008 (GUM); EA-4/02; EURAMET cg-15",
    contribuciones: [
      resolucion("V", "1 cuenta del display → a = 1 dígito/2 (o 1 dígito, según el fabricante)."),
      repetibilidad("V"),
      certPatron("V", "Especificación / certificado del calibrador multifunción patrón. Convierte 'a%·lectura + b%·rango' a un valor absoluto en V y captúralo como U con su k."),
      derivaPatron("V"),
      {
        fuente: "Coeficiente de temperatura del patrón", simbolo: "δV_T",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "V",
        ayuda: "tempco (por °C) × desviación de la temperatura de laboratorio respecto a la de calibración del patrón.",
      },
      {
        fuente: "Fuerzas termoeléctricas / ruido (tensión baja)", simbolo: "δV_te",
        tipo: "B", modo: "semiamplitud", distribucion: "rectangular", valorSugerido: 0, unidad: "V",
        ayuda: "Relevante en rangos de mV: uniones de distinto metal en el circuito de medición.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
async function run() {
  await mongoose.connect(mongoUri);

  if (RESET) {
    await ModeloIncertidumbre.deleteMany({});
    await Magnitud.deleteMany({});
    console.log("· catálogos borrados (--reset)");
  }

  let magsNuevas = 0;
  for (const m of MAGNITUDES) {
    const r = await Magnitud.updateOne(
      { clave: m.clave },
      { $setOnInsert: m },
      { upsert: true }
    );
    if (r.upsertedCount) magsNuevas++;
  }
  console.log(`Magnitudes: ${magsNuevas} nuevas, ${MAGNITUDES.length - magsNuevas} ya existían.`);

  let modNuevos = 0;
  for (const mod of MODELOS) {
    const existe = await ModeloIncertidumbre.findOne({
      magnitud: mod.magnitud,
      tipoInstrumento: mod.tipoInstrumento,
      nombre: mod.nombre,
    });
    if (existe) continue;
    await ModeloIncertidumbre.create(mod);
    modNuevos++;
  }
  console.log(`Modelos de incertidumbre: ${modNuevos} nuevos, ${MODELOS.length - modNuevos} ya existían.`);

  await mongoose.disconnect();
  console.log("Listo.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

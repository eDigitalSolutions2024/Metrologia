/**
 * ============================================================================
 *  ASISTENTE VIRTUAL DE INCERTIDUMBRE  (IA de apoyo — NUNCA calcula el resultado)
 * ============================================================================
 *
 *  Regla arquitectónica dura: el LLM ayuda a INTERPRETAR y SUGERIR; el valor
 *  final de incertidumbre SIEMPRE lo produce el motor determinístico
 *  (services/incertidumbre/engine.js). Este servicio nunca llama al motor ni
 *  devuelve un número "final"; sólo texto, sugerencias de componentes y
 *  detección de datos faltantes / inconsistencias.
 *
 *  - Con ANTHROPIC_API_KEY configurada -> usa el modelo (por defecto sonnet).
 *  - Sin API key                       -> modo "reglas": heurística local útil.
 */
const ModeloIncertidumbre = require("../models/ModeloIncertidumbre");

const API_URL = "https://api.anthropic.com/v1/messages";
const MODELO_IA = process.env.ASISTENTE_MODEL || "claude-sonnet-5";
const DISCLAIMER =
  "El valor final de incertidumbre lo calcula el motor determinístico del sistema (método GUM), no la IA. La IA sólo asiste con la interpretación y la selección de componentes.";

const SYSTEM_PROMPT = `Eres un asistente metrológico que ayuda a un técnico de laboratorio a ARMAR un presupuesto de incertidumbre según la GUM (JCGM 100:2008) y la EA-4/02.

PUEDES:
- Sugerir qué componentes/contribuciones de incertidumbre considerar para el instrumento y la magnitud dados.
- Indicar la distribución típica de cada componente (rectangular, normal, triangular, forma de U) y su divisor.
- Señalar datos que faltan o parecen inconsistentes.
- Explicar conceptos (resolución, repetibilidad, deriva, coeficiente de sensibilidad, grados de libertad, Welch-Satterthwaite, factor de cobertura).
- Ayudar a interpretar un certificado de patrón o un formato no estructurado.

NO DEBES:
- Calcular ni afirmar la incertidumbre combinada o expandida final (u_c, U) ni el factor k final. Eso lo hace el motor determinístico.
- Inventar valores numéricos de componentes que el laboratorio no proporcionó. Si faltan, pídelos.

Responde SIEMPRE en JSON válido con esta forma exacta:
{
  "respuesta": "texto breve y claro para el técnico (máx 120 palabras)",
  "sugerencias": [ { "fuente": "...", "tipo": "A|B", "distribucion": "rectangular|normal|triangular|forma_u", "modo": "semiamplitud|desviacion_std|incertidumbre_std|certificado", "porQue": "..." } ],
  "datosFaltantes": [ "..." ],
  "advertencias": [ "..." ]
}
No incluyas nada fuera del JSON.`;

async function llamarModelo(userContent, { system = SYSTEM_PROMPT, maxTokens = 1100 } = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO_IA,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`IA no disponible (${res.status}): ${detalle.slice(0, 200)}`);
  }
  const data = await res.json();
  const texto = (data.content || []).map((b) => b.text || "").join("").trim();
  return texto;
}

function parseJsonLaxo(texto) {
  if (!texto) return null;
  const limpio = texto.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const m = limpio.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* noop */
      }
    }
    return null;
  }
}

/** Heurística local — se usa cuando no hay API key o si la IA falla. */
async function modoReglas(contexto) {
  const { magnitud, tipoInstrumento } = contexto || {};
  let plantilla = null;
  if (magnitud && tipoInstrumento) {
    plantilla = await ModeloIncertidumbre.findOne({
      magnitud: String(magnitud).toLowerCase(),
      tipoInstrumento: String(tipoInstrumento).toLowerCase(),
      activo: true,
    });
  }

  const sugerencias = plantilla
    ? plantilla.contribuciones.map((c) => ({
        fuente: c.fuente,
        tipo: c.tipo,
        distribucion: c.distribucion,
        modo: c.modo,
        porQue: c.ayuda || "Componente típico de esta plantilla.",
      }))
    : [
        { fuente: "Resolución del instrumento", tipo: "B", distribucion: "rectangular", modo: "semiamplitud", porQue: "Siempre presente; a = resolución/2." },
        { fuente: "Repetibilidad", tipo: "A", distribucion: "normal", modo: "desviacion_std", porQue: "Toma varias lecturas del mismo punto; u = s/√n." },
        { fuente: "Incertidumbre del patrón de referencia", tipo: "B", distribucion: "normal", modo: "certificado", porQue: "Del certificado del patrón: u = U/k." },
        { fuente: "Deriva del patrón", tipo: "B", distribucion: "rectangular", modo: "semiamplitud", porQue: "Cambio entre calibraciones del patrón." },
      ];

  const datosCapturados = (contexto?.contribuciones || []).filter((c) => Number(c.valor) > 0).length;
  const datosFaltantes = [];
  if (!contexto?.lecturas || contexto.lecturas.length < 2) {
    datosFaltantes.push("Lecturas repetidas del punto (para estimar la repetibilidad tipo A).");
  }
  if (!datosCapturados) datosFaltantes.push("Valores numéricos de las contribuciones (resolución, certificado del patrón, etc.).");
  if (contexto?.valorMedido == null && !(contexto?.lecturas?.length)) {
    datosFaltantes.push("Valor medido / punto nominal del mensurando.");
  }

  return {
    modo: "reglas",
    respuesta: plantilla
      ? `Para ${tipoInstrumento} (${magnitud}) la plantilla "${plantilla.nombre}" sugiere ${plantilla.contribuciones.length} componentes. Captura los valores y el motor calculará u_c y U por GUM.`
      : "No hay una plantilla específica para ese instrumento; te propongo los componentes GUM habituales. Captura los valores y el motor hará el cálculo.",
    sugerencias,
    datosFaltantes,
    advertencias: [
      "Asistente en modo reglas (sin IA): configura ANTHROPIC_API_KEY para respuestas contextuales.",
    ],
    nota: DISCLAIMER,
  };
}

async function asistir({ contexto = {}, pregunta = "" } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return modoReglas(contexto);
  }

  const userContent = [
    pregunta ? `Pregunta del técnico: ${pregunta}` : "El técnico pide ayuda para armar el presupuesto de incertidumbre.",
    "",
    "Contexto (JSON):",
    JSON.stringify(
      {
        magnitud: contexto.magnitud,
        tipoInstrumento: contexto.tipoInstrumento,
        mensurando: contexto.mensurando,
        unidad: contexto.unidad,
        puntoNominal: contexto.puntoNominal,
        valorMedido: contexto.valorMedido,
        lecturas: contexto.lecturas,
        contribuciones: contexto.contribuciones,
        equipo: contexto.equipo,
      },
      null,
      2
    ),
  ].join("\n");

  try {
    const texto = await llamarModelo(userContent);
    const json = parseJsonLaxo(texto);
    if (!json) {
      return { modo: "ia", respuesta: texto || "Sin respuesta.", sugerencias: [], datosFaltantes: [], advertencias: ["No se pudo estructurar la respuesta."], nota: DISCLAIMER };
    }
    return {
      modo: "ia",
      respuesta: json.respuesta || "",
      sugerencias: Array.isArray(json.sugerencias) ? json.sugerencias : [],
      datosFaltantes: Array.isArray(json.datosFaltantes) ? json.datosFaltantes : [],
      advertencias: Array.isArray(json.advertencias) ? json.advertencias : [],
      nota: DISCLAIMER,
    };
  } catch (err) {
    const fb = await modoReglas(contexto);
    fb.advertencias.unshift(`La IA no respondió (${err.message}). Se muestra el modo reglas.`);
    return fb;
  }
}

/**
 * ----------------------------------------------------------------------
 *  Interpretación de archivos (Word/Excel) subidos por el usuario -> JSON
 * ----------------------------------------------------------------------
 *  Mismo principio que el asistente de arriba: la IA solo LEE e INTERPRETA
 *  el documento para dejar los campos precargados; el técnico siempre
 *  revisa y confirma antes de guardar. Sin ANTHROPIC_API_KEY configurada
 *  no hay heurística razonable para un documento de formato libre, así que
 *  se avisa claramente en vez de inventar una plantilla.
 */

const PLANTILLA_SYSTEM_PROMPT = `Eres un asistente metrológico. Un laboratorio te da el texto plano extraído de un documento (Word o Excel) que contiene UN presupuesto de incertidumbre de calibración (método GUM / EA-4/02). Tu trabajo es interpretarlo y devolver los datos estructurados para precargar un formulario. NO inventes datos que no estén en el texto: si un campo no aparece, omítelo (no pongas 0 ni un valor inventado).

Responde SIEMPRE en JSON válido con esta forma exacta (usa null u omite lo que no encuentres):
{
  "magnitud": "dimensional|presion|masa|flujo|electrica|mecanica|temperatura|volumen|... (una palabra, minúsculas, la que mejor describa lo medido)",
  "tipoInstrumento": "ej. micrometro, manometro, balanza, vernier...",
  "nombre": "nombre corto para la plantilla, ej. 'Micrómetro exterior 0-25 mm'",
  "mensurando": "qué se mide, ej. 'Error de indicación del micrómetro'",
  "unidad": "unidad del mensurando, ej. mm",
  "normaReferencia": "si se menciona, si no omite (default JCGM 100:2008 (GUM); EA-4/02)",
  "nivelConfianza": "ej. 95.45%",
  "rangoTipico": "ej. 0-25 mm",
  "criterioAceptacion": { "emp": <numero o null>, "regla": "simple|guard_band_U|guard_band_2U" },
  "notas": "cualquier observación relevante que no encaje en otro campo",
  "contribuciones": [
    {
      "fuente": "nombre de la fuente de incertidumbre, ej. Resolución del instrumento",
      "simbolo": "ej. δx_res (si aparece)",
      "tipo": "A|B",
      "modo": "semiamplitud|desviacion_std|incertidumbre_std|certificado",
      "distribucion": "normal|rectangular|triangular|forma_u",
      "valorSugerido": <numero o null>,
      "k": <numero o null>,
      "divisorManual": <numero o null>,
      "coefSensibilidad": <numero o null>,
      "gradosLibertad": <numero o null>,
      "unidad": "unidad de esta contribución",
      "ayuda": "nota corta si el documento explica cómo se obtuvo"
    }
  ],
  "advertencias": [ "cosas ambiguas, en otro idioma, con datos incompletos, etc." ]
}
No incluyas nada fuera del JSON. Si el texto claramente NO es un presupuesto de incertidumbre, responde con "contribuciones": [] y explica en "advertencias".`;

async function interpretarPlantillaIncertidumbre({ texto, nombreArchivo = "" } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      modo: "sin_ia",
      plantilla: null,
      advertencias: [
        "La interpretación automática no está activa en este servidor (falta configurar ANTHROPIC_API_KEY).",
        "Se extrajo el texto del archivo para que lo copies a mano mientras se activa.",
      ],
      textoExtraido: texto,
    };
  }

  const userContent = [
    `Archivo: ${nombreArchivo || "(sin nombre)"}`,
    "",
    "Texto extraído del documento:",
    "-----",
    texto,
    "-----",
  ].join("\n");

  try {
    const respuesta = await llamarModelo(userContent, { system: PLANTILLA_SYSTEM_PROMPT, maxTokens: 2200 });
    const json = parseJsonLaxo(respuesta);
    if (!json) {
      return {
        modo: "sin_ia",
        plantilla: null,
        advertencias: ["La IA no devolvió una plantilla reconocible. Revisa el archivo o captúrala a mano."],
        textoExtraido: texto,
      };
    }
    const { advertencias, ...plantilla } = json;
    return {
      modo: "ia",
      plantilla,
      advertencias: Array.isArray(advertencias) ? advertencias : [],
      nota: "Plantilla generada por IA a partir de tu archivo — revisa cada campo antes de guardar.",
    };
  } catch (err) {
    return {
      modo: "sin_ia",
      plantilla: null,
      advertencias: [`La IA no respondió (${err.message}). Captura la plantilla a mano con el texto extraído como referencia.`],
      textoExtraido: texto,
    };
  }
}

const PERFORMANCE_SYSTEM_PROMPT = `Eres un asistente que interpreta una tabla de puntos de prueba de un instrumento (calibración/performance) que viene de un Word o Excel con encabezados que no siguen un formato fijo (pueden estar en otro idioma, abreviados, en otro orden, con columnas de más).

Devuelve SIEMPRE JSON válido con esta forma exacta:
{
  "puntos": [
    {
      "prueba": "texto o null",
      "nominal": <numero>,
      "unidad": "texto o null",
      "escalaTotal": <numero o null>,
      "porcentajeRdg": <numero o null>,
      "porcentajeFs": <numero o null>,
      "unidades": <numero o null>,
      "incertidumbre": <numero o null>
    }
  ],
  "advertencias": [ "columnas que no pudiste ubicar, filas ambiguas, etc." ]
}
"nominal" es el único campo obligatorio por punto; si una fila no tiene un valor nominal identificable, descártala. No inventes números que no estén en el texto. No incluyas nada fuera del JSON.`;

async function interpretarFilasPerformance({ texto } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { modo: "sin_ia", puntos: [], advertencias: ["La interpretación automática no está activa (falta ANTHROPIC_API_KEY)."] };
  }
  try {
    const respuesta = await llamarModelo(texto, { system: PERFORMANCE_SYSTEM_PROMPT, maxTokens: 1800 });
    const json = parseJsonLaxo(respuesta);
    if (!json || !Array.isArray(json.puntos)) {
      return { modo: "sin_ia", puntos: [], advertencias: ["La IA no devolvió puntos reconocibles."] };
    }
    return { modo: "ia", puntos: json.puntos, advertencias: Array.isArray(json.advertencias) ? json.advertencias : [] };
  } catch (err) {
    return { modo: "sin_ia", puntos: [], advertencias: [`La IA no respondió (${err.message}).`] };
  }
}

module.exports = { asistir, DISCLAIMER, interpretarPlantillaIncertidumbre, interpretarFilasPerformance };

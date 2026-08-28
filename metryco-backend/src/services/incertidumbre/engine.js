/**
 * ============================================================================
 *  MOTOR DETERMINÍSTICO DE INCERTIDUMBRE  ·  método GUM (JCGM 100:2008) + EA-4/02
 * ============================================================================
 *
 *  Mismos inputs  ->  mismo resultado.  Sin IA, sin aleatoriedad, sin estado.
 *  La IA (asistente) sólo sugiere/explica; el número final SIEMPRE sale de aquí.
 *
 *  Pasos:
 *   1. Cada contribución -> incertidumbre estándar  u(xᵢ)  según su modo/distribución.
 *   2. Contribución a la salida:  cᵢ · u(xᵢ)   (cᵢ = coef. de sensibilidad).
 *   3. Incertidumbre combinada (RSS, no correlacionadas):
 *          u_c = sqrt( Σ (cᵢ·u(xᵢ))² )
 *   4. Grados de libertad efectivos (Welch–Satterthwaite):
 *          ν_eff = u_c⁴ / Σ ( (cᵢ·u(xᵢ))⁴ / νᵢ )      (νᵢ = ∞  ->  término = 0)
 *   5. Factor de cobertura  k = t_p(ν_eff)   (tabla EA-4/02;  ν→∞ ⇒ k≈2 para 95.45%).
 *   6. Incertidumbre expandida:  U = k · u_c .
 *
 *  MOTOR_VERSION se guarda en cada cálculo para trazabilidad del método.
 */

const MOTOR_VERSION = "1.0.0";

const SQRT3 = Math.sqrt(3);
const SQRT6 = Math.sqrt(6);
const SQRT2 = Math.sqrt(2);

// Divisor para pasar de semiamplitud "a" a incertidumbre estándar.
const DIVISOR_DISTRIBUCION = {
  normal: 1, // "a" ya es 1σ
  rectangular: SQRT3, // uniforme
  triangular: SQRT6,
  forma_u: SQRT2, // ciclos / desalineación
};

// Tablas de t de Student de dos colas (EA-4/02 Anexo E para 95.45 %; t clásica
// para 95 %). Clave = ν; se interpola linealmente; ν por encima del máximo
// finito usa el valor en ∞.
const TABLA_T = {
  "95.45": {
    1: 13.97, 2: 4.53, 3: 3.31, 4: 2.87, 5: 2.65, 6: 2.52, 7: 2.43, 8: 2.37,
    9: 2.32, 10: 2.28, 11: 2.25, 12: 2.23, 13: 2.21, 14: 2.2, 15: 2.18,
    16: 2.17, 17: 2.16, 18: 2.15, 19: 2.14, 20: 2.13, 25: 2.11, 30: 2.09,
    35: 2.07, 40: 2.06, 45: 2.06, 50: 2.05, 100: 2.025, Infinity: 2.0,
  },
  "95": {
    1: 12.71, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
    8: 2.306, 9: 2.262, 10: 2.228, 12: 2.179, 14: 2.145, 16: 2.12, 18: 2.101,
    20: 2.086, 25: 2.06, 30: 2.042, 40: 2.021, 50: 2.009, 100: 1.984,
    Infinity: 1.96,
  },
};

const K_INFINITO = { "95.45": 2.0, "95": 1.96, "99": 2.576, "99.73": 3.0 };

function normalizarNivel(nivel) {
  if (!nivel) return "95.45";
  const s = String(nivel).replace("%", "").trim();
  if (s.startsWith("95.4") || s === "95.45") return "95.45";
  if (s === "95" || s === "95.0" || s === "95.00") return "95";
  if (s.startsWith("99.7")) return "99.73";
  if (s === "99" || s === "99.0") return "99";
  return "95.45";
}

/** t_p(ν) con interpolación lineal sobre la tabla. */
function factorT(nivelKey, v) {
  if (!Number.isFinite(v) || v <= 0) return K_INFINITO[nivelKey] ?? 2.0;
  const tabla = TABLA_T[nivelKey];
  if (!tabla) return K_INFINITO[nivelKey] ?? 2.0;

  const claves = Object.keys(tabla)
    .filter((k) => k !== "Infinity")
    .map(Number)
    .sort((a, b) => a - b);
  const maxFinito = claves[claves.length - 1];
  if (v >= maxFinito) return tabla.Infinity;
  if (v <= claves[0]) return tabla[claves[0]];

  let lo = claves[0];
  let hi = claves[claves.length - 1];
  for (let i = 0; i < claves.length - 1; i++) {
    if (v >= claves[i] && v <= claves[i + 1]) {
      lo = claves[i];
      hi = claves[i + 1];
      break;
    }
  }
  const t = (v - lo) / (hi - lo);
  return tabla[lo] + t * (tabla[hi] - tabla[lo]);
}

function num(x, def = 0) {
  const n = typeof x === "string" ? parseFloat(x) : x;
  return Number.isFinite(n) ? n : def;
}

/**
 * Incertidumbre estándar u(xᵢ) y grados de libertad νᵢ de UNA contribución.
 * @returns {{ divisor:number, u:number, v:number }}
 */
function estandarizarContribucion(c) {
  const modo = c.modo || "semiamplitud";
  const valor = Math.abs(num(c.valor));
  let divisor = 1;
  let u = 0;
  let v = Number.isFinite(num(c.gradosLibertad, NaN)) && num(c.gradosLibertad) > 0
    ? num(c.gradosLibertad)
    : Infinity;

  switch (modo) {
    case "desviacion_std": {
      // Tipo A: u = s / sqrt(n) ;  ν = n − 1
      const n = Math.max(2, Math.round(num(c.n, 2)));
      divisor = Math.sqrt(n);
      u = valor / divisor;
      v = n - 1;
      break;
    }
    case "incertidumbre_std": {
      // "valor" ya es u(xᵢ).
      divisor = 1;
      u = valor;
      break;
    }
    case "certificado": {
      // "valor" = U del certificado ;  u = U / k
      const k = num(c.k, 2) || 2;
      divisor = k;
      u = valor / k;
      break;
    }
    case "semiamplitud":
    default: {
      // "valor" = semiamplitud a ;  u = a / divisor(distribución)
      divisor =
        num(c.divisorManual, 0) > 0
          ? num(c.divisorManual)
          : DIVISOR_DISTRIBUCION[c.distribucion] ?? SQRT3;
      u = valor / divisor;
      break;
    }
  }

  return { divisor, u, v };
}

/**
 * Calcula el presupuesto completo.
 * @param {object} params
 * @param {Array}  params.contribuciones
 * @param {number} [params.y]              valor del mensurando (para U relativa / expresión)
 * @param {string} [params.nivelConfianza] "95.45%" (default) | "95%" | "99%" | "99.73%"
 * @returns {{ contribuciones:Array, resultado:object, motor:object }}
 */
function calcular({ contribuciones = [], y, nivelConfianza } = {}) {
  const nivelKey = normalizarNivel(nivelConfianza);

  const detalladas = contribuciones.map((c) => {
    const { divisor, u, v } = estandarizarContribucion(c);
    const ci = num(c.coefSensibilidad, 1) || 1;
    const contribucion = Math.abs(ci * u);
    return {
      ...c,
      coefSensibilidad: ci,
      divisor,
      u,
      contribucion,
      _v: v,
    };
  });

  const varianzaCombinada = detalladas.reduce((s, d) => s + d.contribucion ** 2, 0);
  const uCombinada = Math.sqrt(varianzaCombinada);

  // Welch–Satterthwaite
  let denomWS = 0;
  for (const d of detalladas) {
    if (Number.isFinite(d._v) && d._v > 0 && d.contribucion > 0) {
      denomWS += d.contribucion ** 4 / d._v;
    }
  }
  const gradosLibertadEfectivos =
    denomWS > 0 ? uCombinada ** 4 / denomWS : Infinity;

  const k = factorT(nivelKey, gradosLibertadEfectivos);
  const incertidumbreExpandida = k * uCombinada;

  const contribucionesOut = detalladas.map((d) => ({
    fuente: d.fuente,
    simbolo: d.simbolo,
    tipo: d.tipo || "B",
    modo: d.modo || "semiamplitud",
    distribucion: d.distribucion,
    valor: num(d.valor),
    k: num(d.k, 2),
    n: d.n != null ? num(d.n) : undefined,
    divisorManual: d.divisorManual != null ? num(d.divisorManual) : undefined,
    coefSensibilidad: d.coefSensibilidad,
    gradosLibertad: Number.isFinite(d._v) ? d._v : undefined,
    unidad: d.unidad,
    notas: d.notas,
    divisor: round(d.divisor, 6),
    u: round(d.u, 12),
    contribucion: round(d.contribucion, 12),
    porcentajeVarianza:
      varianzaCombinada > 0 ? round((d.contribucion ** 2 / varianzaCombinada) * 100, 2) : 0,
  }));

  const yNum = Number.isFinite(num(y, NaN)) ? num(y) : undefined;
  const nivelTxt = nivelKey === "95" ? "95 %" : nivelKey === "99" ? "99 %" : nivelKey === "99.73" ? "99,73 %" : "95,45 %";
  const kMetodo = Number.isFinite(gradosLibertadEfectivos)
    ? `t-Student ${nivelTxt} con ν_eff = ${round(gradosLibertadEfectivos, 1)}`
    : `k = ${round(k, 3)} (ν_eff → ∞, ${nivelTxt})`;

  const Uround = round2SigniProtegido(incertidumbreExpandida);
  const expresion =
    yNum !== undefined
      ? `(${formatNum(yNum)} ± ${formatNum(Uround)})${unidadTxt(contribucionesOut)}  (k = ${round(k, 2)}; ${nivelTxt})`
      : `U = ${formatNum(Uround)}  (k = ${round(k, 2)}; ${nivelTxt})`;

  return {
    contribuciones: contribucionesOut,
    resultado: {
      y: yNum,
      unidad: unidadTxt(contribucionesOut).trim() || undefined,
      uCombinada: round(uCombinada, 12),
      gradosLibertadEfectivos: Number.isFinite(gradosLibertadEfectivos)
        ? round(gradosLibertadEfectivos, 2)
        : null,
      k: round(k, 4),
      kMetodo,
      incertidumbreExpandida: round(incertidumbreExpandida, 12),
      incertidumbreExpandidaRel:
        yNum && yNum !== 0 ? round(incertidumbreExpandida / Math.abs(yNum), 8) : null,
      nivelConfianza: nivelTxt,
      expresion,
    },
    motor: { nombre: "gum-deterministico", version: MOTOR_VERSION, calculadoEn: new Date() },
  };
}

function round(x, dec) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** dec;
  return Math.round(x * f) / f;
}

// Redondeo a 2 cifras significativas (recomendación GUM para U), protegido.
function round2SigniProtegido(x) {
  if (!Number.isFinite(x) || x === 0) return x;
  const mag = Math.floor(Math.log10(Math.abs(x)));
  const factor = 10 ** (mag - 1);
  return Math.round(x / factor) * factor;
}

function formatNum(x) {
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x) !== 0 && (Math.abs(x) < 1e-4 || Math.abs(x) >= 1e6)) return x.toExponential(3);
  return String(round(x, 8));
}

function unidadTxt(contribs) {
  const u = contribs.find((c) => c.unidad)?.unidad;
  return u ? ` ${u}` : "";
}

module.exports = { calcular, estandarizarContribucion, factorT, MOTOR_VERSION, DIVISOR_DISTRIBUCION };

// Palabras que no aportan identidad al nombre de la empresa (razón social /
// conectores comunes) — se ignoran al armar el prefijo.
const PALABRAS_IGNORADAS = new Set([
  "SA", "CV", "SC", "SAPI", "SOFOM", "SOFIPO", "SRL", "CIA",
  "DE", "DEL", "LA", "LAS", "EL", "LOS", "Y",
]);

/** "Aceros del Bravo SA de CV" -> "AB" · "Intermex Manufactura" -> "IM" */
function prefijoDesdeNombre(nombre = "", fallback = "CLI") {
  const palabras = nombre
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !PALABRAS_IGNORADAS.has(w));

  if (!palabras.length) return fallback;
  if (palabras.length === 1) return palabras[0].slice(0, 3);
  return palabras.map((w) => w[0]).join("").slice(0, 4);
}

module.exports = { prefijoDesdeNombre };

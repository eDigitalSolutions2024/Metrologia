const Counter = require("../models/Counter");

/**
 * Genera folios legibles y consecutivos por año usando la colección `counters`
 * de forma atómica (findOneAndUpdate + $inc), así que es seguro con concurrencia.
 *
 *   siguienteFolio("REP")  ->  "REP-2026-0001"
 *   siguienteFolio("CERT") ->  "CERT-2026-0001"
 *
 * @param {string} prefijo  Prefijo del folio (REP, CERT, ...).
 * @param {number} [digitos=4]  Relleno con ceros a la izquierda.
 */
async function siguienteFolio(prefijo, digitos = 4) {
  const anio = new Date().getFullYear();
  const _id = `${prefijo}-${anio}`;
  const counter = await Counter.findByIdAndUpdate(
    _id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefijo}-${anio}-${String(counter.seq).padStart(digitos, "0")}`;
}

module.exports = { siguienteFolio };

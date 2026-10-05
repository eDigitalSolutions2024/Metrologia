const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const sumaAbonos = (f) => redondear((f.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0));

/**
 * Lo cobrado de una cuenta. Las cuentas anteriores a los abonos que ya estaban
 * pagadas no traen abonos: se consideran cobradas por completo.
 */
function cobradoDe(f) {
  const abonos = sumaAbonos(f);
  if (abonos > 0) return abonos;
  return f.statusPago === 1 ? redondear(f.monto) : 0;
}

/** Lo que aún se debe: 0 si está pagada; si no, monto menos abonos. */
function saldoDe(f) {
  if (f.statusPago === 1) return 0;
  return Math.max(0, redondear(Number(f.monto) - sumaAbonos(f)));
}

module.exports = { redondear, sumaAbonos, cobradoDe, saldoDe };

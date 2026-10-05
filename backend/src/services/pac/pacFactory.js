const pacConfig = require("./pac.config");
const PacNotConfiguredError = require("./PacNotConfiguredError");

/**
 * Entrega la instancia del adaptador PAC configurado, o lanza
 * PacNotConfiguredError. Ningún adaptador real está implementado todavía
 * (providers/ vacío) — cuando se contrate un PAC, se agrega su archivo en
 * providers/<nombre>.js implementando PacProvider y se registra aquí.
 */
function obtenerPac() {
  if (!pacConfig.configurado) {
    throw new PacNotConfiguredError(
      "Faltan PAC_PROVIDER / PAC_API_KEY / PAC_BASE_URL en el .env"
    );
  }

  // Registro de adaptadores reales — se agregan conforme se contraten.
  const adaptadores = {
    dinvbox: () => new (require("./providers/dinvbox"))(pacConfig),
    // facturama: () => new (require("./providers/facturama"))(pacConfig),
    // sw: () => new (require("./providers/sw"))(pacConfig),
    // finkok: () => new (require("./providers/finkok"))(pacConfig),
  };

  // Adaptador de desarrollo: NUNCA timbra de verdad, solo sirve para probar
  // los flujos de la app (timbrar/cancelar/pagos) sin un PAC contratado. Solo
  // se activa si PAC_PROVIDER="simulado" está explícito en el .env — no
  // existe riesgo de activarse solo en producción.
  if (process.env.NODE_ENV !== "production") {
    adaptadores.simulado = () => new (require("./providers/simulado"))();
  }

  const crear = adaptadores[pacConfig.provider];
  if (!crear) {
    throw new PacNotConfiguredError(
      `PAC_PROVIDER="${pacConfig.provider}" no tiene un adaptador implementado todavía`
    );
  }
  return crear();
}

module.exports = { obtenerPac };

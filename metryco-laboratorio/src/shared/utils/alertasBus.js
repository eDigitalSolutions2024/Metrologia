// Bus mínimo para que cualquier pantalla avise al popup de Alertas que algo
// cambió (una cotización se aprobó/rechazó, Calidad autorizó un certificado,
// etc.) y refresque de inmediato en vez de esperar el próximo poll.
const EVENTO = "metryco:alertas:refrescar";

export function pedirRefrescoAlertas() {
  window.dispatchEvent(new Event(EVENTO));
}

export function alSolicitarRefrescoAlertas(callback) {
  window.addEventListener(EVENTO, callback);
  return () => window.removeEventListener(EVENTO, callback);
}

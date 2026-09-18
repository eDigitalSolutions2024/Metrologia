/**
 * Interfaz que debe implementar cualquier adaptador de PAC real (Facturama,
 * SW Sapien, Finkok, ...). `cfdi.service.js` solo conoce esta interfaz, nunca
 * el SDK/API específico del proveedor — así cambiar de PAC no toca el resto
 * del sistema.
 *
 * Ningún método debe simular una respuesta exitosa: si no hay un PAC
 * configurado, `pacFactory.js` nunca instancia una subclase real y
 * `cfdi.service.js` lanza PacNotConfiguredError antes de llegar aquí.
 *
 * Todo error de un método real debe lanzarse como `PacError` (ver
 * PacError.js), marcando `retryable: true` solo cuando es network/timeout —
 * nunca cuando el PAC rechazó el CFDI por datos inválidos (reintentar eso no
 * lo arregla, hay que corregir el comprobante).
 */
class PacProvider {
  /**
   * @param {object} comprobante - snapshot completo del CFDI a timbrar
   *   (emisor, receptor, conceptos, totales) armado por cfdi.service.js
   *   (ver services/cfdiBuilder.js para el mapeo a lo que pida el PAC).
   * @returns {Promise<{uuid: string, xml: string, fechaTimbrado: Date, selloSat?: string, cadenaOriginal?: string}>}
   */
  async timbrarFactura(comprobante) {
    throw new Error(`${this.constructor.name} no implementa timbrarFactura()`);
  }

  /**
   * @param {{uuid: string, motivo: string, folioSustitucion?: string}} datos
   * @returns {Promise<{estatus: string, fechaCancelacion: Date, acuseXml?: string}>}
   */
  async cancelarFactura(datos) {
    throw new Error(`${this.constructor.name} no implementa cancelarFactura()`);
  }

  /** @param {string} uuid @returns {Promise<{estatus: string}>} */
  async consultarFactura(uuid) {
    throw new Error(`${this.constructor.name} no implementa consultarFactura()`);
  }

  /**
   * Recupera el XML timbrado directo del PAC (fallback si el XML guardado
   * localmente se perdiera) — normalmente `cfdi.service.obtenerXml` usa el
   * que ya se guardó en `timbrarFactura`, no este método.
   * @param {string} uuid @returns {Promise<string>}
   */
  async obtenerXml(uuid) {
    throw new Error(`${this.constructor.name} no implementa obtenerXml()`);
  }

  /** @param {string} uuid @returns {Promise<Buffer>} */
  async obtenerPdf(uuid) {
    throw new Error(`${this.constructor.name} no implementa obtenerPdf()`);
  }
}

module.exports = PacProvider;

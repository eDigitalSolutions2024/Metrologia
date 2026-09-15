/**
 * Interfaz que debe implementar cualquier adaptador de PAC real (Facturama,
 * SW Sapien, Finkok, ...). `cfdi.service.js` solo conoce esta interfaz, nunca
 * el SDK/API específico del proveedor — así cambiar de PAC no toca el resto
 * del sistema.
 *
 * Ningún método debe simular una respuesta exitosa: si no hay un PAC
 * configurado, `pacFactory.js` nunca instancia una subclase real y
 * `cfdi.service.js` lanza PacNotConfiguredError antes de llegar aquí.
 */
class PacProvider {
  /**
   * @param {object} comprobante - snapshot completo del CFDI a timbrar
   *   (emisor, receptor, conceptos, totales) armado por cfdi.service.js.
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

  /** @param {string} uuid @returns {Promise<Buffer>} */
  async obtenerPdf(uuid) {
    throw new Error(`${this.constructor.name} no implementa obtenerPdf()`);
  }
}

module.exports = PacProvider;

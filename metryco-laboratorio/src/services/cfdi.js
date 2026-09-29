import api, { ENDPOINTS } from "./api";

export async function listarCfdi({ clienteId = "", estado = "", tipoPago = "", search = "", page = 0, pageSize = 20 } = {}) {
  const { data } = await api.get(ENDPOINTS.CFDI, { params: { clienteId, estado, tipoPago, search, page, pageSize } });
  return { items: data.data, total: data.total };
}

export async function obtenerCfdi(id) {
  const { data } = await api.get(`${ENDPOINTS.CFDI}/${id}`);
  return data.data;
}

export async function crearCfdi(payload) {
  const { data } = await api.post(ENDPOINTS.CFDI, payload);
  return data.data;
}

export async function actualizarCfdi(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.CFDI}/${id}`, payload);
  return data.data;
}

export async function eliminarCfdi(id) {
  await api.delete(`${ENDPOINTS.CFDI}/${id}`);
}

export async function timbrarCfdi(id) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/${id}/timbrar`);
  return data.data;
}

export async function cancelarCfdi(id, motivoCodigo, motivo, folioSustitucion) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/${id}/cancelar`, { motivoCodigo, motivo, folioSustitucion });
  return data.data;
}

export async function resolverSolicitudCancelacionCfdi(id, aceptar) {
  const { data } = await api.patch(`${ENDPOINTS.CFDI}/${id}/cancelacion`, { aceptar });
  return data.data;
}

export async function confirmarCancelacionEnProcesoCfdi(id) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/${id}/confirmar-cancelacion`);
  return data.data;
}

export async function emitirComplementoPago(payload) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/pagos`, payload);
  return data.data;
}

export async function previsualizarXmlCfdi(id) {
  const { data } = await api.get(`${ENDPOINTS.CFDI}/${id}/xml-preview`);
  return data.data;
}

export async function descargarXmlCfdi(id) {
  const { data } = await api.get(`${ENDPOINTS.CFDI}/${id}/xml`, { responseType: "blob" });
  return data;
}

export async function descargarPdfCfdi(id) {
  const { data } = await api.get(`${ENDPOINTS.CFDI}/${id}/pdf`, { responseType: "blob" });
  return data;
}

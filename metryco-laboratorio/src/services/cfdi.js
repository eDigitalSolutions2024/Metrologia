import api, { ENDPOINTS } from "./api";

export async function listarCfdi({ clienteId = "", estado = "", page = 0, pageSize = 20 } = {}) {
  const { data } = await api.get(ENDPOINTS.CFDI, { params: { clienteId, estado, page, pageSize } });
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

export async function timbrarCfdi(id) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/${id}/timbrar`);
  return data.data;
}

export async function cancelarCfdi(id, motivo, folioSustitucion) {
  const { data } = await api.post(`${ENDPOINTS.CFDI}/${id}/cancelar`, { motivo, folioSustitucion });
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

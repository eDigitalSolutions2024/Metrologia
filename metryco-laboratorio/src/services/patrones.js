import api, { ENDPOINTS } from "./api";

export async function listarPatrones({ search = "", categoria = "", vigencia = "", estado = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.PATRONES, {
    params: { search, categoria, vigencia, estado, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerPatron(id) {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/${id}`);
  return data.data;
}

export async function crearPatron(payload) {
  const { data } = await api.post(ENDPOINTS.PATRONES, payload);
  return data.data;
}

export async function actualizarPatron(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.PATRONES}/${id}`, payload);
  return data.data;
}

export async function eliminarPatron(id) {
  const { data } = await api.delete(`${ENDPOINTS.PATRONES}/${id}`);
  return data.data;
}

export async function obtenerSiguienteCodigoPatron() {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/siguiente-codigo`);
  return data.data.codigo;
}

export async function adjuntarCertificadoPatron(id, file) {
  const form = new FormData();
  form.append("archivo", file);
  const { data } = await api.post(`${ENDPOINTS.PATRONES}/${id}/certificado`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

// Alias histórico
export const subirCertificadoPatron = adjuntarCertificadoPatron;

export async function fetchCertificadoPatronBlob(id) {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/${id}/certificado`, { responseType: "blob" });
  return data;
}

export async function fetchQrPatronBlob(id, tipo = "png") {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/${id}/qr.${tipo}`, { responseType: "blob" });
  return data;
}

export async function patronesPorVencer(dias = 30) {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/por-vencer`, { params: { dias } });
  return data.data;
}

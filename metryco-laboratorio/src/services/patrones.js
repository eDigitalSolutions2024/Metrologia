import api, { ENDPOINTS } from "./api";

export async function listarPatrones({ search = "", categoria = "", soloVigentes = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.PATRONES, {
    params: { search, categoria, soloVigentes, page, pageSize },
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

export async function subirCertificadoPatron(id, archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await api.post(`${ENDPOINTS.PATRONES}/${id}/certificado`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function fetchCertificadoPatronBlob(id) {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/${id}/certificado`, { responseType: "blob" });
  return data;
}

export async function fetchQrPatronBlob(id, tipo = "png") {
  const { data } = await api.get(`${ENDPOINTS.PATRONES}/${id}/qr.${tipo}`, { responseType: "blob" });
  return data;
}

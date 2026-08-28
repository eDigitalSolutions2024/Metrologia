import api, { ENDPOINTS } from "./api";
import { API_BASE_URL } from "./api";

export async function listarCertificados({ search = "", clienteId = "", estado = "", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.CERTIFICADOS, {
    params: { search, clienteId, estado, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerCertificado(id) {
  const { data } = await api.get(`${ENDPOINTS.CERTIFICADOS}/${id}`);
  return data.data;
}

export async function emitirCertificado(payload) {
  const { data } = await api.post(ENDPOINTS.CERTIFICADOS, payload);
  return data.data;
}

export async function actualizarCertificado(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.CERTIFICADOS}/${id}`, payload);
  return data.data;
}

export async function cambiarEstadoCertificado(id, estado) {
  const { data } = await api.patch(`${ENDPOINTS.CERTIFICADOS}/${id}/estado`, { estado });
  return data.data;
}

export async function anularCertificado(id, motivo) {
  const { data } = await api.post(`${ENDPOINTS.CERTIFICADOS}/${id}/anular`, { motivo });
  return data.data;
}

export async function regenerarTokenCertificado(id) {
  const { data } = await api.post(`${ENDPOINTS.CERTIFICADOS}/${id}/regenerar-token`);
  return data.data;
}

export async function adjuntarPdfCertificado(id, file) {
  const form = new FormData();
  form.append("archivo", file);
  const { data } = await api.post(`${ENDPOINTS.CERTIFICADOS}/${id}/pdf`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

/* URLs directas (pasan por el proxy de Vite; el interceptor añade el Bearer) */
export const qrPngUrl = (id) => `${API_BASE_URL}${ENDPOINTS.CERTIFICADOS}/${id}/qr.png`;
export const qrSvgUrl = (id) => `${API_BASE_URL}${ENDPOINTS.CERTIFICADOS}/${id}/qr.svg`;
export const pdfUrl = (id) => `${API_BASE_URL}${ENDPOINTS.CERTIFICADOS}/${id}/pdf`;

/* Descarga el QR como PNG autenticado y devuelve un objectURL para <img>/descarga. */
export async function fetchQrBlob(id, tipo = "png") {
  const { data } = await api.get(`${ENDPOINTS.CERTIFICADOS}/${id}/qr.${tipo}`, {
    responseType: "blob",
  });
  return data;
}

export async function fetchPdfBlob(id) {
  const { data } = await api.get(`${ENDPOINTS.CERTIFICADOS}/${id}/pdf`, { responseType: "blob" });
  return data;
}

/* ---- Consulta pública (sin sesión) ---- */
export async function verificarPublico(token) {
  const { data } = await api.get(`${ENDPOINTS.PUBLICO}/certificado/${token}`);
  return data.data;
}
export const publicoQrUrl = (token) => `${API_BASE_URL}${ENDPOINTS.PUBLICO}/certificado/${token}/qr.png`;
export const publicoPdfUrl = (token) => `${API_BASE_URL}${ENDPOINTS.PUBLICO}/certificado/${token}/pdf`;

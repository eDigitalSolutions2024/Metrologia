import api, { ENDPOINTS } from "./api";

export async function listarRazonesSociales({ soloActivas = "" } = {}) {
  const { data } = await api.get(ENDPOINTS.RAZONES_SOCIALES, { params: { soloActivas } });
  return data.data;
}

export async function obtenerRazonSocial(id) {
  const { data } = await api.get(`${ENDPOINTS.RAZONES_SOCIALES}/${id}`);
  return data.data;
}

export async function crearRazonSocial(payload) {
  const { data } = await api.post(ENDPOINTS.RAZONES_SOCIALES, payload);
  return data.data;
}

export async function actualizarRazonSocial(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.RAZONES_SOCIALES}/${id}`, payload);
  return data.data;
}

export async function eliminarRazonSocial(id) {
  const { data } = await api.delete(`${ENDPOINTS.RAZONES_SOCIALES}/${id}`);
  return data.data;
}

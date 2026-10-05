import api, { ENDPOINTS } from "./api";

export async function listarActividades({ year, month } = {}) {
  const { data } = await api.get(ENDPOINTS.ACTIVIDADES, { params: { year, month } });
  return data.data;
}

export async function crearActividad(payload) {
  const { data } = await api.post(ENDPOINTS.ACTIVIDADES, payload);
  return data.data;
}

export async function actualizarActividad(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.ACTIVIDADES}/${id}`, payload);
  return data.data;
}

export async function eliminarActividad(id) {
  const { data } = await api.delete(`${ENDPOINTS.ACTIVIDADES}/${id}`);
  return data.data;
}

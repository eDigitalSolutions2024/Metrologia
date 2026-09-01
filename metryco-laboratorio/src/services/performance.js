import api, { ENDPOINTS } from "./api";

export async function listarPerformance({ search = "", magnitud = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.PERFORMANCE, {
    params: { search, magnitud, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerPerformance(id) {
  const { data } = await api.get(`${ENDPOINTS.PERFORMANCE}/${id}`);
  return data.data;
}

export async function crearPerformance(payload) {
  const { data } = await api.post(ENDPOINTS.PERFORMANCE, payload);
  return data.data;
}

export async function actualizarPerformance(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.PERFORMANCE}/${id}`, payload);
  return data.data;
}

export async function eliminarPerformance(id) {
  const { data } = await api.delete(`${ENDPOINTS.PERFORMANCE}/${id}`);
  return data.data;
}

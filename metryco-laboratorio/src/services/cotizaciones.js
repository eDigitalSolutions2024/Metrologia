import api, { ENDPOINTS } from "./api";

export async function listarCotizaciones({ search = "", status = "todos", mes = "", anio = "", clienteId = "", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.COTIZACIONES, {
    params: { search, status, mes, anio, clienteId, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerCotizacion(id) {
  const { data } = await api.get(`${ENDPOINTS.COTIZACIONES}/${id}`);
  return data.data;
}

export async function crearCotizacion(payload) {
  const { data } = await api.post(ENDPOINTS.COTIZACIONES, payload);
  return data.data;
}

export async function actualizarCotizacion(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.COTIZACIONES}/${id}`, payload);
  return data.data;
}

export async function eliminarCotizacion(id) {
  const { data } = await api.delete(`${ENDPOINTS.COTIZACIONES}/${id}`);
  return data;
}

import api, { ENDPOINTS } from "./api";

export async function listarEquipos({ search = "", clienteId = "", categoria = "", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.EQUIPOS, {
    params: { search, clienteId, categoria, page, pageSize },
  });
  return { items: data.data, total: data.total };
}
export async function obtenerEquipo(id) {
  const { data } = await api.get(`${ENDPOINTS.EQUIPOS}/${id}`);
  return data.data;
}
export async function crearEquipo(payload) {
  const { data } = await api.post(ENDPOINTS.EQUIPOS, payload);
  return data.data;
}
export async function actualizarEquipo(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.EQUIPOS}/${id}`, payload);
  return data.data;
}
export async function eliminarEquipo(id) {
  const { data } = await api.delete(`${ENDPOINTS.EQUIPOS}/${id}`);
  return data.data;
}

export async function obtenerSiguienteIdInterno(clienteId) {
  const { data } = await api.get(`${ENDPOINTS.EQUIPOS}/siguiente-id`, { params: { cliente: clienteId } });
  return data.data.idInterno;
}

export async function fetchQrEquipoBlob(id, tipo = "png") {
  const { data } = await api.get(`${ENDPOINTS.EQUIPOS}/${id}/qr.${tipo}`, { responseType: "blob" });
  return data;
}

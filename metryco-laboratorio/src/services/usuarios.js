import api, { ENDPOINTS } from "./api";

export async function obtenerDirectorio() {
  const { data } = await api.get(`${ENDPOINTS.USUARIOS}/directorio`);
  return data.data;
}

export async function listarUsuarios({ search = "", status = "", rol = "", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.USUARIOS, {
    params: { search, status, rol, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerUsuario(id) {
  const { data } = await api.get(`${ENDPOINTS.USUARIOS}/${id}`);
  return data.data;
}

export async function crearUsuario(payload) {
  const { data } = await api.post(ENDPOINTS.USUARIOS, payload);
  return data.data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.USUARIOS}/${id}`, payload);
  return data.data;
}

export async function desactivarUsuario(id) {
  const { data } = await api.delete(`${ENDPOINTS.USUARIOS}/${id}`);
  return data.data;
}

export async function reactivarUsuario(id) {
  const { data } = await api.patch(`${ENDPOINTS.USUARIOS}/${id}/reactivar`);
  return data.data;
}

export async function eliminarUsuario(id) {
  const { data } = await api.delete(`${ENDPOINTS.USUARIOS}/${id}/permanente`);
  return data.data;
}

export async function agregarObservacion(id, texto) {
  const { data } = await api.post(`${ENDPOINTS.USUARIOS}/${id}/observaciones`, { texto });
  return data.data;
}

export async function eliminarObservacion(id, observacionId) {
  const { data } = await api.delete(`${ENDPOINTS.USUARIOS}/${id}/observaciones/${observacionId}`);
  return data.data;
}

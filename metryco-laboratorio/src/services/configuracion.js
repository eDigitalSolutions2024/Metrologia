import api, { ENDPOINTS } from "./api";

export async function obtenerMenuPermisos() {
  const { data } = await api.get(`${ENDPOINTS.CONFIGURACION}/menu`);
  return data.data; // { [key]: string[] } — vacío si nunca se ha personalizado
}

export async function actualizarMenuPermisos(permisos) {
  const { data } = await api.put(`${ENDPOINTS.CONFIGURACION}/menu`, { permisos });
  return data.data;
}

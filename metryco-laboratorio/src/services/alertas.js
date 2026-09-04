import api, { ENDPOINTS } from "./api";

export async function obtenerAlertas() {
  const { data } = await api.get(ENDPOINTS.ALERTAS);
  return data.data; // [{ clave, titulo, ruta, total, items: [{id, texto}] }]
}

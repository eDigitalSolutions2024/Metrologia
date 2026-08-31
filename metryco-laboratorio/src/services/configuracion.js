import api, { ENDPOINTS, API_BASE_URL } from "./api";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export function logoUrl(nombreArchivo) {
  return nombreArchivo ? `${BACKEND_ORIGIN}/uploads/logos/${nombreArchivo}` : null;
}

export async function obtenerMenuPermisos() {
  const { data } = await api.get(`${ENDPOINTS.CONFIGURACION}/menu`);
  return data.data; // { [key]: string[] } — vacío si nunca se ha personalizado
}

export async function actualizarMenuPermisos(permisos) {
  const { data } = await api.put(`${ENDPOINTS.CONFIGURACION}/menu`, { permisos });
  return data.data;
}

export async function obtenerLaboratorio() {
  const { data } = await api.get(`${ENDPOINTS.CONFIGURACION}/laboratorio`);
  return data.data; // { nombre, acreditacion, rfc, domicilio, telefono }
}

export async function actualizarLaboratorio(datos) {
  const { data } = await api.put(`${ENDPOINTS.CONFIGURACION}/laboratorio`, datos);
  return data.data;
}

export async function obtenerLogo() {
  const { data } = await api.get(`${ENDPOINTS.CONFIGURACION}/logo`);
  return data.data; // { nombreArchivo } | null
}

export async function subirLogo(archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await api.post(`${ENDPOINTS.CONFIGURACION}/logo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function eliminarLogo() {
  await api.delete(`${ENDPOINTS.CONFIGURACION}/logo`);
}

export async function obtenerColores() {
  const { data } = await api.get(`${ENDPOINTS.CONFIGURACION}/colores`);
  return data.data; // { primario, secundario }
}

export async function actualizarColores(colores) {
  const { data } = await api.put(`${ENDPOINTS.CONFIGURACION}/colores`, colores);
  return data.data;
}

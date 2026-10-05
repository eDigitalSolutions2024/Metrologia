import api, { ENDPOINTS, API_BASE_URL } from "./api";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export function fotoUrl(nombreArchivo) {
  return nombreArchivo ? `${BACKEND_ORIGIN}/uploads/fotos-perfil/${nombreArchivo}` : null;
}
export function firmaUrl(nombreArchivo) {
  return nombreArchivo ? `${BACKEND_ORIGIN}/uploads/firmas/${nombreArchivo}` : null;
}

export async function obtenerMiPerfil() {
  const { data } = await api.get(ENDPOINTS.PERFIL);
  return data.data;
}

export async function obtenerColoresAvatar() {
  const { data } = await api.get(`${ENDPOINTS.PERFIL}/colores-avatar`);
  return data.data;
}

export async function cambiarMiPassword(passwordActual, passwordNueva) {
  await api.put(`${ENDPOINTS.PERFIL}/password`, { passwordActual, passwordNueva });
}

export async function elegirColorAvatar(color) {
  const { data } = await api.put(`${ENDPOINTS.PERFIL}/avatar-color`, { color });
  return data.data;
}

export async function subirMiFoto(archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await api.post(`${ENDPOINTS.PERFIL}/foto`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function eliminarMiFoto() {
  const { data } = await api.delete(`${ENDPOINTS.PERFIL}/foto`);
  return data.data;
}

export async function subirMiFirma(archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await api.post(`${ENDPOINTS.PERFIL}/firma`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function eliminarMiFirma() {
  const { data } = await api.delete(`${ENDPOINTS.PERFIL}/firma`);
  return data.data;
}

export async function obtenerMiActividad() {
  const { data } = await api.get(`${ENDPOINTS.PERFIL}/actividad`);
  return data.data;
}

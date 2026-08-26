import api, { ENDPOINTS } from "../../services/api";

export async function loginRequest(usuario, password) {
  const { data } = await api.post(ENDPOINTS.LOGIN, { usuario, password });
  return data.data; // { token, user }
}

export async function verificarPasswordAdmin(password) {
  await api.post(ENDPOINTS.VERIFICAR_ADMIN, { password });
}

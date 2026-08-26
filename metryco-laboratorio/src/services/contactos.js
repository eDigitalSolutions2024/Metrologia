import api, { ENDPOINTS } from "./api";

export async function listarContactos(clienteId) {
  const { data } = await api.get(`${ENDPOINTS.CLIENTES}/${clienteId}/contactos`);
  return data.data;
}

export async function crearContacto(clienteId, payload) {
  const { data } = await api.post(`${ENDPOINTS.CLIENTES}/${clienteId}/contactos`, payload);
  return data.data;
}

export async function actualizarContacto(clienteId, id, payload) {
  const { data } = await api.put(`${ENDPOINTS.CLIENTES}/${clienteId}/contactos/${id}`, payload);
  return data.data;
}

export async function eliminarContacto(clienteId, id) {
  const { data } = await api.delete(`${ENDPOINTS.CLIENTES}/${clienteId}/contactos/${id}`);
  return data.data;
}

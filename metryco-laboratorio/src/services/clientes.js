import api, { ENDPOINTS } from "./api";

export async function listarClientes({ search = "", sector = "todos", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.CLIENTES, {
    params: { search, sector, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerCliente(id) {
  const { data } = await api.get(`${ENDPOINTS.CLIENTES}/${id}`);
  return data.data;
}

export async function crearCliente(payload) {
  const { data } = await api.post(ENDPOINTS.CLIENTES, payload);
  return data.data;
}

export async function actualizarCliente(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.CLIENTES}/${id}`, payload);
  return data.data;
}

export async function eliminarCliente(id) {
  const { data } = await api.delete(`${ENDPOINTS.CLIENTES}/${id}`);
  return data.data;
}

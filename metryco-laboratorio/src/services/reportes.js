import api, { ENDPOINTS } from "./api";

export async function listarReportes({ search = "", status = "todos", clienteId = "", page = 0, pageSize = 10 } = {}) {
  const { data } = await api.get(ENDPOINTS.REPORTES, {
    params: { search, status, clienteId, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function obtenerReporte(id) {
  const { data } = await api.get(`${ENDPOINTS.REPORTES}/${id}`);
  return data.data; // { reporte, asignaciones }
}

export async function crearReporte(payload) {
  const { data } = await api.post(ENDPOINTS.REPORTES, payload);
  return data.data;
}

export async function actualizarReporte(id, payload) {
  const { data } = await api.put(`${ENDPOINTS.REPORTES}/${id}`, payload);
  return data.data;
}

export async function eliminarReporte(id) {
  const { data } = await api.delete(`${ENDPOINTS.REPORTES}/${id}`);
  return data.data;
}

/* ---- Asignaciones ---- */
export async function listarAsignaciones({ reporteId = "", estadoCertificado = "", estadoCalibracion = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.ASIGNACIONES, {
    params: { reporteId, estadoCertificado, estadoCalibracion, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

export async function crearAsignacion(payload) {
  const { data } = await api.post(ENDPOINTS.ASIGNACIONES, payload);
  return data.data;
}

export async function cambiarEstadoAsignacion(id, { dominio, valor, motivo }) {
  const { data } = await api.patch(`${ENDPOINTS.ASIGNACIONES}/${id}/estado`, { dominio, valor, motivo });
  return data.data;
}

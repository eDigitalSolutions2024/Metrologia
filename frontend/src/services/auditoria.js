import api, { ENDPOINTS } from "./api";

export async function listarAuditoria({ accion = "", usuario = "", exito = "", desde = "", hasta = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.AUDITORIA, {
    params: { accion, usuario, exito, desde, hasta, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

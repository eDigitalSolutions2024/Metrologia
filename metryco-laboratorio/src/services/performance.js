import api, { ENDPOINTS } from "./api";

export async function listarPerformance({ search = "", magnitud = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.PERFORMANCE, {
    params: { search, magnitud, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

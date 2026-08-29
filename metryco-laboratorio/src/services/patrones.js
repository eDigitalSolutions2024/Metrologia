import api, { ENDPOINTS } from "./api";

export async function listarPatrones({ search = "", categoria = "", soloVigentes = "", page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(ENDPOINTS.PATRONES, {
    params: { search, categoria, soloVigentes, page, pageSize },
  });
  return { items: data.data, total: data.total };
}

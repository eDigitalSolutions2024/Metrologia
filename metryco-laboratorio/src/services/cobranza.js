import api, { ENDPOINTS } from "./api";

export async function listarFacturas({ clienteId = "" } = {}) {
  const { data } = await api.get(ENDPOINTS.COBRANZA, { params: { clienteId } });
  return data.data;
}

export async function crearFactura(payload) {
  const { data } = await api.post(ENDPOINTS.COBRANZA, payload);
  return data.data;
}

export async function aplicarPagoFactura(id, fechaPagada) {
  const { data } = await api.patch(`${ENDPOINTS.COBRANZA}/${id}/pagar`, { fechaPagada });
  return data.data;
}

export async function reabrirFactura(id) {
  const { data } = await api.patch(`${ENDPOINTS.COBRANZA}/${id}/reabrir`);
  return data.data;
}

import api, { ENDPOINTS } from "./api";

const base = ENDPOINTS.INCERTIDUMBRE;

/* ---- Magnitudes / catálogo ---- */
export async function listarMagnitudes() {
  const { data } = await api.get(ENDPOINTS.MAGNITUDES);
  return data.data;
}

/* ---- Modelos (plantillas de presupuesto) ---- */
export async function listarModelos({ magnitud = "", tipoInstrumento = "" } = {}) {
  const { data } = await api.get(`${base}/modelos`, { params: { magnitud, tipoInstrumento } });
  return data.data;
}
export async function obtenerModelo(id) {
  const { data } = await api.get(`${base}/modelos/${id}`);
  return data.data;
}
export async function crearModelo(payload) {
  const { data } = await api.post(`${base}/modelos`, payload);
  return data.data;
}
export async function actualizarModelo(id, payload) {
  const { data } = await api.put(`${base}/modelos/${id}`, payload);
  return data.data;
}

/* ---- Motor determinístico (preview en vivo, no persiste) ---- */
export async function previewIncertidumbre(payload) {
  const { data } = await api.post(`${base}/preview`, payload);
  return data.data; // { contribuciones, resultado, motor }
}

/* ---- Asistente virtual (IA de apoyo, nunca calcula el resultado final) ---- */
export async function consultarAsistente({ contexto, pregunta }) {
  const { data } = await api.post(`${base}/asistente`, { contexto, pregunta });
  return data.data;
}

/* ---- Cálculos ejecutados (con trazabilidad y versionado) ---- */
export async function listarCalculos(params = {}) {
  const { data } = await api.get(`${base}/calculos`, { params });
  return { items: data.data, total: data.total };
}
export async function obtenerCalculo(id) {
  const { data } = await api.get(`${base}/calculos/${id}`);
  return data.data;
}
export async function crearCalculo(payload) {
  const { data } = await api.post(`${base}/calculos`, payload);
  return data.data;
}
export async function recalcularCalculo(id, payload) {
  const { data } = await api.patch(`${base}/calculos/${id}/recalcular`, payload);
  return data.data;
}
export async function revisarCalculo(id) {
  const { data } = await api.patch(`${base}/calculos/${id}/revisar`);
  return data.data;
}
export async function aprobarCalculo(id) {
  const { data } = await api.patch(`${base}/calculos/${id}/aprobar`);
  return data.data;
}

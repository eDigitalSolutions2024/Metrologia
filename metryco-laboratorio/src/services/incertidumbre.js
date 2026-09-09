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
export async function eliminarModelo(id) {
  const { data } = await api.delete(`${base}/modelos/${id}`);
  return data.data;
}

// Sube un Word (.docx) o Excel (.xlsx/.xls) con un presupuesto de
// incertidumbre "tal cual lo usan" y la IA lo interpreta. No guarda nada:
// devuelve { modo: "ia"|"sin_ia", plantilla, advertencias, textoExtraido? }
// para precargar el formulario de plantilla nueva.
export async function importarModelo(archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await api.post(`${base}/modelos/importar`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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

// Aprueba de un jalón todos los cálculos calculados/revisados de una
// asignación — usado por "Aprobar y autorizar certificado" en el Reporte.
export async function aprobarCalculosPorAsignacion(asignacionId) {
  const { data } = await api.patch(`${base}/calculos/aprobar-por-asignacion/${asignacionId}`);
  return data.data; // { aprobados: number }
}

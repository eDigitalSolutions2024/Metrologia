// Catálogo SAT c_MotivoCancelacion (vigente desde la reforma de cancelación
// de 2018).
export const MOTIVOS_CANCELACION = [
  { value: "01", label: "01 - Comprobante emitido con errores con relación" },
  { value: "02", label: "02 - Comprobante emitido con errores sin relación" },
  { value: "03", label: "03 - No se llevó a cabo la operación" },
  { value: "04", label: "04 - Operación nominativa en una factura global" },
];

export const ESTADO_CFDI_CHIP = {
  borrador: { label: "Borrador", color: "default" },
  pendiente_timbrar: { label: "Pendiente de timbrar", color: "info" },
  timbrando: { label: "Timbrando…", color: "warning" },
  timbrada: { label: "Timbrada", color: "success" },
  error_timbrado: { label: "Error de timbrado", color: "error" },
  cancelacion_pendiente: { label: "Cancelación pendiente", color: "warning" },
  cancelada: { label: "Cancelada", color: "default" },
};

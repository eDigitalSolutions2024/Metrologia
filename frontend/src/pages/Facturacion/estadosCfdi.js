// Catálogo SAT c_MotivoCancelacion (vigente desde la reforma de cancelación
// de 2018).
export const MOTIVOS_CANCELACION = [
  { value: "01", label: "01 - Comprobante emitido con errores con relación" },
  { value: "02", label: "02 - Comprobante emitido con errores sin relación" },
  { value: "03", label: "03 - No se llevó a cabo la operación" },
  { value: "04", label: "04 - Operación nominativa en una factura global" },
];

// Catálogo SAT c_FormaPago (solo las opciones que el formulario ofrece, ver
// CrearCfdiDialog/RegistrarPagoDialog) — nombre corto para mostrar en tablas,
// donde no cabe "03 - Transferencia electrónica" completo.
export const FORMAS_PAGO_SAT = {
  "01": "Efectivo",
  "02": "Cheque nominativo",
  "03": "Transferencia",
  "04": "Tarjeta de crédito",
  "28": "Tarjeta de débito",
  "99": "Por definir",
};

export const ESTADO_CFDI_CHIP = {
  borrador: { label: "Borrador", color: "default" },
  pendiente_timbrar: { label: "Pendiente de timbrar", color: "info" },
  timbrando: { label: "Timbrando…", color: "warning" },
  timbrada: { label: "Timbrada", color: "success" },
  error_timbrado: { label: "Error de timbrado", color: "error" },
  cancelacion_pendiente: { label: "Cancelación pendiente (receptor)", color: "warning" },
  cancelacion_en_proceso: { label: "Cancelación en proceso (PAC)", color: "warning" },
  cancelada: { label: "Cancelada", color: "default" },
};

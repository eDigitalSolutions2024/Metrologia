// Refleja la tabla real `events` del PHP legacy (php/calendario_generar.php,
// php/calendario_consultar.php): registro simple de pago por cobrar, sin abonos
// parciales ni referencia a cotización — solo cliente, OC, folio, monto, fecha de
// creación/recepción (fechaCr) y días de pago (15/30/60/0), que determinan la
// fecha de vencimiento (fechaPago = fechaCr + diasPago).
export const MOCK = [
  {
    id: 1, oc: "OC-4471", clienteId: 3, clienteNombre: "ASSA ABLOY MEXICO SA DE CV",
    folio: "FAC-2025-034", monto: 11136, fechaCr: "2025-06-18", diasPago: 30,
    fechaPago: "2025-07-18", statusPago: 1, fechaPagada: "2025-07-15", comentarios: "",
  },
  {
    id: 2, oc: "OC-4488", clienteId: 4, clienteNombre: "HONEYWELL AEROSPACE TECHNOLOGIES",
    folio: "FAC-2025-033", monto: 83520, fechaCr: "2025-06-20", diasPago: 30,
    fechaPago: "2025-07-20", statusPago: 0, fechaPagada: "", comentarios: "Pago en 2 exhibiciones acordado por cliente.",
  },
  {
    id: 3, oc: "OC-4392", clienteId: 2, clienteNombre: "FOXCONN INDUSTRIAL INTERNET SA DE CV",
    folio: "FAC-2025-029", monto: 54200, fechaCr: "2025-05-20", diasPago: 30,
    fechaPago: "2025-06-20", statusPago: 0, fechaPagada: "", comentarios: "Cliente reporta atraso administrativo.",
  },
  {
    id: 4, oc: "OC-4401", clienteId: 1, clienteNombre: "AUDI MEXICO SA DE CV",
    folio: "FAC-2025-028", monto: 48000, fechaCr: "2025-05-15", diasPago: 15,
    fechaPago: "2025-05-30", statusPago: 1, fechaPagada: "2025-05-28", comentarios: "",
  },
  {
    id: 5, oc: "OC-4512", clienteId: 3, clienteNombre: "ASSA ABLOY MEXICO SA DE CV",
    folio: "FAC-2025-027", monto: 22400, fechaCr: "2025-05-10", diasPago: 60,
    fechaPago: "2025-07-09", statusPago: 0, fechaPagada: "", comentarios: "",
  },
];

export const DIAS_PAGO_OPCIONES = [15, 30, 60, 0];

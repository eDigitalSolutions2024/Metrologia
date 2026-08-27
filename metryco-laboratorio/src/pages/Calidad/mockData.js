// Refleja la estructura real de `asignaciones` en el PHP legacy (php/calidad_buscar.php):
// cada fila es una asignación de calibración pendiente o rechazada por Calidad.
// statusAsignacion: 0 = en proceso (sin portada/gráfica aún), 1 = capturada (con portada/gráfica)
// statusCalidad: 0 = pendiente de revisión, 2 = rechazado (1 = aprobado, ya no aparece en esta cola)
export const MOCK = [
  {
    id: 1041,
    clienteId: 1,
    cliente: "AUDI MEXICO SA DE CV",
    idClienteInterno: "AUDI-EQ-014",
    fechaAsignacion: "2025-06-20",
    fechaCaptura: "2025-06-26",
    tecnico: "Ing. Sánchez",
    statusAsignacion: 1,
    statusCalidad: 0,
    historial: [],
  },
  {
    id: 1038,
    clienteId: 2,
    cliente: "FOXCONN INDUSTRIAL INTERNET SA DE CV",
    idClienteInterno: "FOX-EQ-007",
    fechaAsignacion: "2025-06-18",
    fechaCaptura: "2025-06-25",
    tecnico: "Ing. Pérez",
    statusAsignacion: 1,
    statusCalidad: 2,
    historial: [
      { fecha: "2025-06-25", comentario: "Falta firma del técnico en la hoja de datos originales." },
    ],
  },
  {
    id: 1035,
    clienteId: 3,
    cliente: "ASSA ABLOY MEXICO SA DE CV",
    idClienteInterno: "ASA-EQ-002",
    fechaAsignacion: "2025-06-15",
    fechaCaptura: null,
    tecnico: "Ing. Sánchez",
    statusAsignacion: 0,
    statusCalidad: 0,
    historial: [],
  },
  {
    id: 1029,
    clienteId: 4,
    cliente: "HONEYWELL AEROSPACE TECHNOLOGIES",
    idClienteInterno: "HON-EQ-021",
    fechaAsignacion: "2025-06-10",
    fechaCaptura: "2025-06-14",
    tecnico: "Ing. Ruiz",
    statusAsignacion: 1,
    statusCalidad: 2,
    historial: [
      { fecha: "2025-06-14", comentario: "Incertidumbre reportada fuera del rango del procedimiento." },
      { fecha: "2025-06-16", comentario: "Se corrigió cálculo, pendiente de volver a capturar." },
    ],
  },
  {
    id: 1022,
    clienteId: 1,
    cliente: "AUDI MEXICO SA DE CV",
    idClienteInterno: "AUDI-EQ-009",
    fechaAsignacion: "2025-06-05",
    fechaCaptura: "2025-06-09",
    tecnico: "Ing. Pérez",
    statusAsignacion: 1,
    statusCalidad: 0,
    historial: [],
  },
];

export const CLIENTES_MOCK = [
  { id: 1, nombre: "AUDI MEXICO SA DE CV" },
  { id: 2, nombre: "FOXCONN INDUSTRIAL INTERNET SA DE CV" },
  { id: 3, nombre: "ASSA ABLOY MEXICO SA DE CV" },
  { id: 4, nombre: "HONEYWELL AEROSPACE TECHNOLOGIES" },
];

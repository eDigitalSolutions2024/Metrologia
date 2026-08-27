// Refleja las tablas reales `equipo` y `patrones` del PHP legacy (php/nequipo.php,
// php/npatron.php): el equipo pertenece a un cliente (empId) y se calibra usando
// uno o más patrones de referencia propiedad del laboratorio.
export const EQUIPOS_MOCK = [
  {
    id: 1, idInterno: "AUDI-EQ-014", clienteId: 1, clienteNombre: "AUDI MEXICO SA DE CV",
    marca: "Mitutoyo", modelo: "530-322", serie: "MX-12345", descripcion: "Vernier digital",
    categoria: "Dimensional", costo: 4500, moneda: "MXN", comentarios: "",
    localizacion: "Área de metrología", unidades: "mm", divMinima: "0.01",
    rango: "0–150 mm", rangoUso: "0–150 mm", rangoCalibracion: "0–150 mm",
    patrones: [1],
  },
  {
    id: 2, idInterno: "FOX-EQ-007", clienteId: 2, clienteNombre: "FOXCONN INDUSTRIAL INTERNET SA DE CV",
    marca: "Fluke", modelo: "87V", serie: "FL-34567", descripcion: "Multímetro digital",
    categoria: "Electrica", costo: 8200, moneda: "MXN", comentarios: "",
    localizacion: "Línea de producción 3", unidades: "V", divMinima: "0.1",
    rango: "0–1000 V", rangoUso: "0–1000 V", rangoCalibracion: "0–1000 V",
    patrones: [2],
  },
  {
    id: 3, idInterno: "ASA-EQ-002", clienteId: 3, clienteNombre: "ASSA ABLOY MEXICO SA DE CV",
    marca: "Keller", modelo: "LEO 3", serie: "KE-67890", descripcion: "Manómetro digital",
    categoria: "Presion", costo: 6100, moneda: "MXN", comentarios: "Requiere adaptador",
    localizacion: "Almacén de calidad", unidades: "bar", divMinima: "0.001",
    rango: "0–700 bar", rangoUso: "0–700 bar", rangoCalibracion: "0–700 bar",
    patrones: [3],
  },
  {
    id: 4, idInterno: "HON-EQ-021", clienteId: 4, clienteNombre: "HONEYWELL AEROSPACE TECHNOLOGIES",
    marca: "Fluke", modelo: "52-II", serie: "FL-45678", descripcion: "Termómetro de contacto",
    categoria: "Temperatura", costo: 3800, moneda: "MXN", comentarios: "",
    localizacion: "Laboratorio de pruebas", unidades: "°C", divMinima: "0.1",
    rango: "-200–1090 °C", rangoUso: "-50–500 °C", rangoCalibracion: "-50–500 °C",
    patrones: [3, 4],
  },
];

export const PATRONES_MOCK = [
  {
    id: 1, idInterno: "PAT-001", categoria: "Dimensional", marca: "Mitutoyo", modelo: "516-950",
    serie: "MX-PAT-01", descripcion: "Bloque patrón acero grado 1", comentarios: "",
    trazabilidad: "CENAM", fechaVencimiento: "2025-09-15", fechaCalibracion: "2024-09-15",
    unidades: "mm", capacidad: "1–100 mm", divMin: "0.001 mm", certificado: "CENAM-2024-001",
    filePdf: "", manejo: "Manipular con guantes de algodón.", proceso: "Comparación directa según PG-CAL-001.",
    transporte: "Estuche rígido acolchado.", almacenamiento: "Ambiente controlado 20±2°C, 45–55% HR.",
  },
  {
    id: 2, idInterno: "PAT-002", categoria: "Electrica", marca: "Fluke", modelo: "5730A",
    serie: "FL-PAT-02", descripcion: "Multímetro de referencia 8.5 dígitos", comentarios: "",
    trazabilidad: "NIM", fechaVencimiento: "2025-07-20", fechaCalibracion: "2024-07-20",
    unidades: "V", capacidad: "0–1000 V DC/AC", divMin: "5 µV", certificado: "NIM-2024-042",
    filePdf: "", manejo: "Evitar descargas electrostáticas.", proceso: "Calibración según IT-ELE-001.",
    transporte: "Maleta antiestática.", almacenamiento: "Ambiente controlado, libre de polvo.",
  },
  {
    id: 3, idInterno: "PAT-003", categoria: "Presion", marca: "GE Druck", modelo: "PACE1000",
    serie: "GE-PAT-03", descripcion: "Calibrador de presión digital", comentarios: "",
    trazabilidad: "CENAM", fechaVencimiento: "2025-06-10", fechaCalibracion: "2024-06-10",
    unidades: "bar", capacidad: "0–700 bar", divMin: "0.001 bar", certificado: "CENAM-2024-110",
    filePdf: "", manejo: "No exceder la presión máxima nominal.", proceso: "Comparación con patrón primario.",
    transporte: "Caja rígida con espuma.", almacenamiento: "Libre de humedad y vibraciones.",
  },
  {
    id: 4, idInterno: "PAT-004", categoria: "Temperatura", marca: "Fluke", modelo: "1523",
    serie: "FL-PAT-04", descripcion: "Termómetro de referencia SPRT", comentarios: "",
    trazabilidad: "CENAM", fechaVencimiento: "2025-12-01", fechaCalibracion: "2024-12-01",
    unidades: "°C", capacidad: "-200–660 °C", divMin: "0.01 °C", certificado: "CENAM-2024-089",
    filePdf: "", manejo: "Evitar choques térmicos bruscos.", proceso: "Comparación en baño de temperatura.",
    transporte: "Estuche con protección al vacío.", almacenamiento: "Vertical, sin dobleces en el cable.",
  },
];

// Refleja las tablas reales `performance_master` (plantilla) + `performance`
// (puntos de prueba) del PHP legacy (php/nperformance.php, php/input_form.php):
// cada plantilla define los puntos de prueba y tolerancias usados al calibrar
// un tipo de equipo — nominal, %RDG, %FS, incertidumbre -> mínimo/máximo calculados.
export const MOCK = [
  {
    id: 1, nombre: "Vernier digital 0-150mm", comentarios: "Plantilla estándar dimensional",
    imagen: "",
    puntos: [
      { prueba: "Punto 1", nominal: 25, unidad: "mm", escala: 150, rdg: 0.01, fs: 0.01, unidades: 0.001, incertidumbre: 0.005, minimo: 24.98, minimoReal: 24.985, maximo: 25.02, maximoReal: 25.015 },
      { prueba: "Punto 2", nominal: 75, unidad: "mm", escala: 150, rdg: 0.01, fs: 0.01, unidades: 0.001, incertidumbre: 0.005, minimo: 74.97, minimoReal: 74.975, maximo: 75.03, maximoReal: 75.025 },
      { prueba: "Punto 3", nominal: 150, unidad: "mm", escala: 150, rdg: 0.01, fs: 0.01, unidades: 0.001, incertidumbre: 0.005, minimo: 149.95, minimoReal: 149.955, maximo: 150.05, maximoReal: 150.045 },
    ],
  },
  {
    id: 2, nombre: "Multímetro 0-1000V", comentarios: "Plantilla eléctrica voltaje DC",
    imagen: "",
    puntos: [
      { prueba: "Punto 1", nominal: 100, unidad: "V", escala: 1000, rdg: 0.02, fs: 0.005, unidades: 0.0001, incertidumbre: 0.01, minimo: 99.95, minimoReal: 99.96, maximo: 100.05, maximoReal: 100.04 },
      { prueba: "Punto 2", nominal: 500, unidad: "V", escala: 1000, rdg: 0.02, fs: 0.005, unidades: 0.0001, incertidumbre: 0.01, minimo: 499.85, minimoReal: 499.86, maximo: 500.15, maximoReal: 500.14 },
    ],
  },
];

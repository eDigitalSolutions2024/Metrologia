// Catálogo oficial del SAT c_RegimenFiscal (CFDI 4.0) — usado tanto en el
// régimen fiscal del EMISOR (Administración → Datos del Laboratorio) como
// del RECEPTOR (alta de Cliente), porque el CFDI exige el mismo catálogo
// para ambos. `fisica`/`moral` indican a qué tipo de contribuyente aplica
// cada régimen, según el catálogo publicado por el SAT.
export const REGIMENES_FISCALES = [
  { value: "601", descripcion: "General de Ley Personas Morales", fisica: false, moral: true },
  { value: "603", descripcion: "Personas Morales con Fines no Lucrativos", fisica: false, moral: true },
  { value: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios", fisica: true, moral: false },
  { value: "606", descripcion: "Arrendamiento", fisica: true, moral: false },
  { value: "607", descripcion: "Régimen de Enajenación o Adquisición de Bienes", fisica: true, moral: false },
  { value: "608", descripcion: "Demás ingresos", fisica: true, moral: false },
  { value: "610", descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México", fisica: true, moral: true },
  { value: "611", descripcion: "Ingresos por Dividendos (socios y accionistas)", fisica: true, moral: false },
  { value: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales", fisica: true, moral: false },
  { value: "614", descripcion: "Ingresos por intereses", fisica: true, moral: false },
  { value: "615", descripcion: "Régimen de los ingresos por obtención de premios", fisica: true, moral: false },
  { value: "616", descripcion: "Sin obligaciones fiscales", fisica: true, moral: false },
  { value: "620", descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", fisica: false, moral: true },
  { value: "621", descripcion: "Incorporación Fiscal", fisica: true, moral: false },
  { value: "622", descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", fisica: true, moral: true },
  { value: "623", descripcion: "Opcional para Grupos de Sociedades", fisica: false, moral: true },
  { value: "624", descripcion: "Coordinados", fisica: false, moral: true },
  { value: "625", descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", fisica: true, moral: false },
  { value: "626", descripcion: "Régimen Simplificado de Confianza (RESICO)", fisica: true, moral: true },
];

// Compatibilidad: texto plano "código - descripción", útil para mostrar el
// valor ya elegido en el Select cerrado o en cualquier lugar de solo lectura.
export function labelRegimenFiscal(value) {
  const r = REGIMENES_FISCALES.find((x) => x.value === value);
  return r ? `${r.value} - ${r.descripcion}` : value || "";
}

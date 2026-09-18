// Catálogo oficial del SAT c_RegimenFiscal (CFDI 4.0) — usado tanto en el
// régimen fiscal del EMISOR (Administración → Datos del Laboratorio) como
// del RECEPTOR (alta de Cliente), porque el CFDI exige el mismo catálogo
// para ambos. `fisica`/`moral` indican a qué tipo de contribuyente aplica
// cada régimen, según el catálogo publicado por el SAT.
export const REGIMENES_FISCALES = [
  { value: "601", label: "601 - General de Ley Personas Morales", fisica: false, moral: true },
  { value: "603", label: "603 - Personas Morales con Fines no Lucrativos", fisica: false, moral: true },
  { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios", fisica: true, moral: false },
  { value: "606", label: "606 - Arrendamiento", fisica: true, moral: false },
  { value: "607", label: "607 - Régimen de Enajenación o Adquisición de Bienes", fisica: true, moral: false },
  { value: "608", label: "608 - Demás ingresos", fisica: true, moral: false },
  { value: "610", label: "610 - Residentes en el Extranjero sin Establecimiento Permanente en México", fisica: true, moral: true },
  { value: "611", label: "611 - Ingresos por Dividendos (socios y accionistas)", fisica: true, moral: false },
  { value: "612", label: "612 - Personas Físicas con Actividades Empresariales y Profesionales", fisica: true, moral: false },
  { value: "614", label: "614 - Ingresos por intereses", fisica: true, moral: false },
  { value: "615", label: "615 - Régimen de los ingresos por obtención de premios", fisica: true, moral: false },
  { value: "616", label: "616 - Sin obligaciones fiscales", fisica: true, moral: false },
  { value: "620", label: "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos", fisica: false, moral: true },
  { value: "621", label: "621 - Incorporación Fiscal", fisica: true, moral: false },
  { value: "622", label: "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", fisica: true, moral: true },
  { value: "623", label: "623 - Opcional para Grupos de Sociedades", fisica: false, moral: true },
  { value: "624", label: "624 - Coordinados", fisica: false, moral: true },
  { value: "625", label: "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", fisica: true, moral: false },
  { value: "626", label: "626 - Régimen Simplificado de Confianza (RESICO)", fisica: true, moral: true },
];

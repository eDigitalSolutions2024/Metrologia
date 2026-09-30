// Catálogo de sectores de cliente — usado en el formulario (captura) y en
// ClientesPage (columna/filtro), para que ambos lados usen la misma lista.
export const SECTORES = [
  { value: "automotriz", label: "Automotriz", color: "primary" },
  { value: "aeroespacial", label: "Aeroespacial", color: "info" },
  { value: "electronica", label: "Electrónica", color: "secondary" },
  { value: "alimentos", label: "Alimentos", color: "success" },
  { value: "farmaceutica", label: "Farmacéutica", color: "warning" },
  { value: "manufactura", label: "Manufactura", color: "default" },
];

export const SECTOR_MAP = Object.fromEntries(
  SECTORES.map(({ value, label, color }) => [value, { label, color }])
);

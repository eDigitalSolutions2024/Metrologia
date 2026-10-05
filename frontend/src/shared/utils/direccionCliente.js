export function direccionCliente(cliente) {
  const d = cliente?.domicilioFiscal;
  if (!d) return "";
  return [
    [d.calle, d.numExterior, d.numInterior].filter(Boolean).join(" "),
    d.colonia,
    [d.municipio, d.ciudad].filter(Boolean).join(", "),
    d.estado,
    d.cp,
  ].filter(Boolean).join(", ");
}

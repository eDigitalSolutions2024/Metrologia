export function exportCsv(filas, nombreArchivo) {
  const csv = [
    Object.keys(filas[0] ?? { info: "" }).join(","),
    ...filas.map((f) => Object.values(f).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

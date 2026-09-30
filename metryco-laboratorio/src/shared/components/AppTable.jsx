import { useLayoutEffect, useRef, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Box, Typography, CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

// Elementos dentro de una fila que tienen su propio clic: al pulsarlos NO se
// dispara el clic de la fila (así botones, iconos, checkboxes, enlaces, menús y
// diálogos abiertos desde la fila no la abren por accidente).
const INTERACTIVOS =
  "button, a, input, textarea, select, label, [role='button'], [role='checkbox'], [role='menuitem'], " +
  ".MuiCheckbox-root, .MuiSwitch-root, .MuiChip-clickable, .Mui-disabled, .MuiPopover-root, .MuiModal-root, [data-no-row-click]";

// Anchos mínimos de la TABLA (no de la ventana: el menú lateral le quita espacio) a partir de
// los cuales se muestra una columna marcada con `hideBelow`.
const UMBRALES = { sm: 400, md: 600, lg: 860, xl: 1150 };

/**
 * Tabla base del sistema.
 *
 * Props de columna: { field, headerName, renderCell, align, width, minWidth,
 *   nowrap    — no partir el texto en varias líneas (teléfonos, fechas, RFC, montos, folios),
 *   hideBelow — "sm" | "md" | "lg" | "xl" | número de px: oculta la columna cuando la tabla
 *               mide menos que eso (para datos secundarios; así se adapta en vez de
 *               comprimir todo o forzar un scroll horizontal),
 *   sticky    — "right": la columna queda fija al borde derecho (ideal para Acciones) y nunca
 *               se pierde si aún hace falta desplazar. }
 * `renderCell(row, { compacto, estrecho, ancho })`: `compacto` es true con menos de 1000 px de tabla y `estrecho` con menos de 820.
 * Props de tabla: `onRowClick(row)` hace la fila clicable; `dense` compacta el espaciado.
 */
export default function AppTable({
  columns = [],
  rows = [],
  loading = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  emptyText = "Sin registros",
  maxHeight,
  onRowClick,
  dense = false,
}) {
  const contenedorRef = useRef(null);
  const [ancho, setAncho] = useState(null);

  useLayoutEffect(() => {
    const el = contenedorRef.current;
    if (!el) return undefined;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Las celdas reciben { compacto }: true cuando la tabla mide poco, para que simplifiquen su contenido.
  const contexto = { ancho, compacto: ancho != null && ancho < 1000, estrecho: ancho != null && ancho < 820 };
  const visible = (col) => !col.hideBelow || ancho == null || ancho >= (UMBRALES[col.hideBelow] ?? col.hideBelow);
  const cols = columns.filter(visible);

  const padX = dense ? 1.25 : 2.25;
  const fijar = (col, fondo) => (col.sticky === "right"
    ? { position: "sticky", right: 0, zIndex: 2, backgroundColor: fondo, boxShadow: "-8px 0 8px -8px rgba(0,0,0,.45)" }
    : {});

  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}
    >
      {/* TableContainer trae su propio overflow-x:auto — anidar ese
          scroll-container dentro del overflow:hidden+borderRadius del Paper
          es un caso conocido en Chrome donde el recorte redondeado del padre
          no se aplica al contenido del hijo, dejando ver la esquina cuadrada
          del fondo del encabezado. Repetir el radio aquí (heredado del Paper)
          hace que el propio contenedor con scroll recorte igual. */}
      <TableContainer
        ref={contenedorRef}
        sx={{
          maxHeight, borderRadius: "inherit",
          // Barra de desplazamiento delgada y discreta (en vez de la gruesa del navegador).
          scrollbarWidth: "thin",
          scrollbarColor: (t) => `${alpha(t.palette.text.primary, 0.3)} transparent`,
          "&::-webkit-scrollbar": { height: 8, width: 8 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: (t) => alpha(t.palette.text.primary, 0.28), borderRadius: 8 },
          "&::-webkit-scrollbar-thumb:hover": { backgroundColor: (t) => alpha(t.palette.text.primary, 0.45) },
        }}
      >
        <Table size="small" stickyHeader={!!maxHeight}>
          <TableHead>
            <TableRow>
              {cols.map((col) => (
                <TableCell
                  key={col.field}
                  align={col.align || "left"}
                  sx={{
                    py: dense ? 1.25 : 1.75, px: padX, whiteSpace: "nowrap", width: col.width, minWidth: col.minWidth,
                    ...fijar(col, "background.default"),
                  }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={cols.length} align="center" sx={{ py: 7 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols.length} align="center" sx={{ py: 7 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: "text.secondary" }}>
                    <InboxOutlinedIcon sx={{ fontSize: 34, opacity: 0.6 }} />
                    <Typography color="text.secondary">{emptyText}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.id ?? row._id ?? idx}
                  hover
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? (e) => { if (!e.target.closest(INTERACTIVOS)) onRowClick(row); } : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row); } : undefined}
                  sx={{
                    cursor: onRowClick ? "pointer" : "default",
                    "&:last-child td": { border: 0 },
                    // El resaltado va como capa encima del fondo de cada celda, así también
                    // cubre a la columna fija sin volverla transparente.
                    "&:hover td": { backgroundImage: (t) => `linear-gradient(${t.palette.action.hover}, ${t.palette.action.hover})` },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                  }}
                >
                  {cols.map((col) => (
                    <TableCell
                      key={col.field}
                      align={col.align || "left"}
                      sx={{
                        fontSize: 13.5, lineHeight: 1.45, py: dense ? 1.1 : 1.5, px: padX, verticalAlign: "middle",
                        // Nunca partir una palabra a la mitad; los textos largos se acomodan en varias líneas.
                        overflowWrap: "break-word", wordBreak: "normal", hyphens: "none",
                        whiteSpace: col.nowrap ? "nowrap" : "normal",
                        width: col.width, minWidth: col.minWidth,
                        ...fijar(col, "background.paper"),
                      }}
                    >
                      {col.renderCell ? col.renderCell(row, contexto) : row[col.field] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <Box sx={{ borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => onPageChange(p)}
            onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value))}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Filas:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Box>
      )}
    </Paper>
  );
}

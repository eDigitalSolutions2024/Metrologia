import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Box, Typography, CircularProgress,
} from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

// Elementos dentro de una fila que tienen su propio clic: al pulsarlos NO se
// dispara el clic de la fila (así botones, iconos, checkboxes, enlaces, menús y
// diálogos abiertos desde la fila no la abren por accidente).
const INTERACTIVOS =
  "button, a, input, textarea, select, label, [role='button'], [role='checkbox'], [role='menuitem'], " +
  ".MuiCheckbox-root, .MuiSwitch-root, .MuiChip-clickable, .Mui-disabled, .MuiPopover-root, .MuiModal-root, [data-no-row-click]";

/**
 * Tabla base del sistema.
 *
 * Props de columna: { field, headerName, renderCell, align, width, minWidth,
 *   nowrap  — no partir el texto en varias líneas (teléfonos, fechas, RFC, montos, folios),
 *   hideBelow — "sm" | "md" | "lg" | "xl": oculta la columna en pantallas más chicas
 *               (para datos secundarios; así la tabla se adapta en vez de comprimir todo). }
 * `onRowClick(row)`: hace la fila clicable (abrir ver / editar / detalle).
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
}) {
  const visibilidad = (col) => (col.hideBelow ? { display: { xs: "none", [col.hideBelow]: "table-cell" } } : {});

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
      <TableContainer sx={{ maxHeight, borderRadius: "inherit" }}>
        <Table size="small" stickyHeader={!!maxHeight}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  align={col.align || "left"}
                  sx={{ py: 1.75, px: 2.25, whiteSpace: "nowrap", width: col.width, minWidth: col.minWidth, ...visibilidad(col) }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 7 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 7 }}>
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
                    "& td": { transition: "background-color .12s ease" },
                    "&:hover td": { backgroundColor: "action.hover" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      align={col.align || "left"}
                      sx={{
                        fontSize: 13.5, lineHeight: 1.45, py: 1.5, px: 2.25, verticalAlign: "middle",
                        // Nunca partir una palabra a la mitad; los textos largos se acomodan en varias líneas.
                        overflowWrap: "break-word", wordBreak: "normal", hyphens: "none",
                        whiteSpace: col.nowrap ? "nowrap" : "normal",
                        width: col.width, minWidth: col.minWidth, ...visibilidad(col),
                      }}
                    >
                      {col.renderCell ? col.renderCell(row) : row[col.field] ?? "—"}
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

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Box, Typography, CircularProgress,
} from "@mui/material";

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
}) {
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
                <TableCell key={col.field} align={col.align || "left"} sx={{ py: 1.75, px: 2.25 }}>
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
                  <Typography color="text.secondary">{emptyText}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.id ?? row._id ?? idx}
                  hover
                  sx={{
                    "&:last-child td": { border: 0 },
                    "& td": { transition: "background-color .12s ease" },
                    "&:hover td": { backgroundColor: "action.hover" },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.field} align={col.align || "left"} sx={{ fontSize: 13, py: 1.35, px: 2.25 }}>
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

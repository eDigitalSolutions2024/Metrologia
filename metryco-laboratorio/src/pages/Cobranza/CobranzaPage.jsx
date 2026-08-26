import { useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, Grid, Paper, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import { CheckCircleOutlined as CheckCircleOutlineIcon } from "@mui/icons-material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

import AppTable from "../../shared/components/AppTable";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { MOCK } from "./mockData";

const STATUS_MAP = {
  pendiente: { label: "Pendiente",    color: "warning" },
  pagado:    { label: "Pagado",       color: "success" },
  vencido:   { label: "Vencido",      color: "error" },
  parcial:   { label: "Pago Parcial", color: "info" },
};


export default function CobranzaPage() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(0);

  const filtered = MOCK.filter((f) => {
    const matchSearch =
      f.folio.toLowerCase().includes(search.toLowerCase()) ||
      f.cliente.toLowerCase().includes(search.toLowerCase()) ||
      f.cotizacion.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPendiente = MOCK.filter((f) => f.status !== "pagado").reduce((s, f) => s + f.saldo, 0);
  const totalVencido   = MOCK.filter((f) => f.status === "vencido").reduce((s, f) => s + f.saldo, 0);
  const totalCobrado   = MOCK.filter((f) => f.status === "pagado").reduce((s, f) => s + f.monto, 0);

  const columns = [
    { field: "folio",            headerName: "No. Factura" },
    { field: "cotizacion",       headerName: "Cotización" },
    { field: "cliente",          headerName: "Cliente" },
    { field: "monto",            headerName: "Monto",   renderCell: (row) => formatCurrency(row.monto) },
    { field: "abono",            headerName: "Abonado", renderCell: (row) => formatCurrency(row.abono) },
    { field: "saldo",            headerName: "Saldo",   renderCell: (row) => (
      <Typography fontWeight={700} fontSize={13} color={row.saldo > 0 ? "error.main" : "success.main"}>
        {formatCurrency(row.saldo)}
      </Typography>
    )},
    { field: "fechaEmision",     headerName: "Emisión",     renderCell: (row) => formatDate(row.fechaEmision) },
    { field: "fechaVencimiento", headerName: "Vencimiento", renderCell: (row) => formatDate(row.fechaVencimiento) },
    {
      field: "status",
      headerName: "Estado",
      renderCell: (row) => {
        const s = STATUS_MAP[row.status] ?? { label: row.status, color: "default" };
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Ver detalle">
            <IconButton size="small">
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar factura">
            <IconButton size="small">
              <FileDownloadOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </IconButton>
          </Tooltip>
          {row.status !== "pagado" && (
            <Tooltip title="Registrar pago">
              <IconButton size="small">
                <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Cuentas por Cobrar</Typography>

      {/* Resumen financiero */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total Pendiente", valor: totalPendiente, color: theme.palette.warning.main },
          { label: "Total Vencido",   valor: totalVencido,   color: theme.palette.error.main },
          { label: "Total Cobrado",   valor: totalCobrado,   color: theme.palette.success.main },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: s.color + "1A" }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color, mt: 0.5 }}>
                {formatCurrency(s.valor)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por factura, cotización o cliente..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 380, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="parcial">Pago Parcial</MenuItem>
            <MenuItem value="vencido">Vencido</MenuItem>
            <MenuItem value="pagado">Pagado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={filtered.slice(page * 10, page * 10 + 10)}
        totalCount={filtered.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
      />
    </Box>
  );
}

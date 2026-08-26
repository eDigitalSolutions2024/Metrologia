import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel,
  Grid, Paper, Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import { formatDate } from "../../shared/utils/formatDate";
import { MOCK } from "./mockData";

const STATUS_MAP = {
  proceso:   { label: "En Proceso",  color: "warning" },
  revision:  { label: "En Revisión", color: "info" },
  emitido:   { label: "Emitido",     color: "success" },
  entregado: { label: "Entregado",   color: "default" },
};

const TIPO_COLOR = {
  "Dimensional":   "#2563EB",
  "Eléctrica":     "#10B981",
  "Temperatura":   "#F59E0B",
  "Presión":       "#EF4444",
  "Fuerza":        "#8B5CF6",
  "Masa":          "#06B6D4",
};

export default function ReportesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [page, setPage] = useState(0);

  const filtered = MOCK.filter((r) => {
    const matchSearch =
      r.folio.toLowerCase().includes(search.toLowerCase()) ||
      r.cliente.toLowerCase().includes(search.toLowerCase()) ||
      r.tecnico.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || r.status === statusFilter;
    const matchTipo   = tipoFilter   === "todos" || r.tipo   === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  const stats = useMemo(() => {
    const total = MOCK.length;
    const porEstado = (estado) => MOCK.filter((r) => r.status === estado).length;
    return [
      { titulo: "Total de Reportes", valor: total, icono: <DescriptionOutlinedIcon sx={{ fontSize: 28 }} />, color: theme.palette.secondary.main, sub: "Este periodo" },
      { titulo: "En Proceso",        valor: porEstado("proceso"),   icono: <HourglassTopOutlinedIcon sx={{ fontSize: 28 }} />, color: theme.palette.warning.main, sub: "Pendientes de avance" },
      { titulo: "En Revisión",       valor: porEstado("revision"),  icono: <RateReviewOutlinedIcon sx={{ fontSize: 28 }} />,   color: theme.palette.info?.main || "#0288D1", sub: "Antes de emitir" },
      { titulo: "Entregados",        valor: porEstado("entregado"), icono: <TaskAltOutlinedIcon sx={{ fontSize: 28 }} />,      color: theme.palette.success.main, sub: "Ciclo completo" },
    ];
  }, [theme]);

  const columns = [
    {
      field: "folio",
      headerName: "Reporte",
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <Avatar
            sx={{
              width: 32, height: 32, flexShrink: 0, fontSize: 13, fontWeight: 700,
              bgcolor: (TIPO_COLOR[row.tipo] ?? theme.palette.secondary.main) + "1F",
              color: TIPO_COLOR[row.tipo] ?? theme.palette.secondary.main,
            }}
          >
            {row.tipo.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{row.folio}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {row.cliente}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "tipo",
      headerName: "Tipo",
      renderCell: (row) => (
        <Chip
          label={row.tipo}
          size="small"
          sx={{ bgcolor: (TIPO_COLOR[row.tipo] ?? "#6B7280") + "18", color: TIPO_COLOR[row.tipo] ?? "#6B7280", fontWeight: 600 }}
        />
      ),
    },
    { field: "magnitud",       headerName: "Magnitud" },
    { field: "equipos",        headerName: "Equipos", align: "center" },
    { field: "tecnico",        headerName: "Técnico" },
    { field: "fechaRecepcion", headerName: "Recepción",  renderCell: (row) => formatDate(row.fechaRecepcion) },
    { field: "fechaEmision",   headerName: "Emisión",    renderCell: (row) => formatDate(row.fechaEmision) },
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
          <Tooltip title="Ver reporte">
            <IconButton size="small">
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small">
              <EditOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar PDF">
            <span>
              <IconButton size="small" disabled={row.status === "proceso"}>
                <FileDownloadOutlinedIcon fontSize="small" sx={{ color: row.status === "proceso" ? "text.disabled" : "success.main" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reportes de Calibración</Typography>
          <Typography variant="body2" color="text.secondary">{filtered.length} de {MOCK.length} registros</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <AppButton
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => navigate("/reportes/exportar")}
            sx={{ borderRadius: 2 }}
          >
            Exportar
          </AppButton>
          <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }}>
            Nuevo Reporte
          </AppButton>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        {stats.map((card) => (
          <Grid key={card.titulo} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: "divider",
                transition: ".3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" mb={1}>
                    {card.titulo}
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {card.valor}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" mt={1} display="block">
                    {card.sub}
                  </Typography>
                </Box>
                <Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 3, background: card.color + "18", color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {card.icono}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por folio, cliente o técnico..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 340, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
            <MenuItem value="proceso">En Proceso</MenuItem>
            <MenuItem value="revision">En Revisión</MenuItem>
            <MenuItem value="emitido">Emitido</MenuItem>
            <MenuItem value="entregado">Entregado</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo</InputLabel>
          <Select label="Tipo" value={tipoFilter} onChange={(e) => { setTipoFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos los tipos</MenuItem>
            <MenuItem value="Dimensional">Dimensional</MenuItem>
            <MenuItem value="Eléctrica">Eléctrica</MenuItem>
            <MenuItem value="Temperatura">Temperatura</MenuItem>
            <MenuItem value="Presión">Presión</MenuItem>
            <MenuItem value="Fuerza">Fuerza</MenuItem>
            <MenuItem value="Masa">Masa</MenuItem>
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

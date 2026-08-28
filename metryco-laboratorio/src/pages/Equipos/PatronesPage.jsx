import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Chip, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { exportCsv } from "../../shared/utils/exportCsv";
import { PATRONES_MOCK } from "./mockData";

function diasParaVencer(fecha) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha) - new Date()) / 86400000);
}

function estadoVigencia(fecha) {
  const dias = diasParaVencer(fecha);
  if (dias === null) return { label: "Sin fecha", color: "default" };
  if (dias < 0) return { label: "Vencido", color: "error" };
  if (dias < 45) return { label: "Por Vencer", color: "warning" };
  return { label: "Vigente", color: "success" };
}

// Consultar Patrones = php/patrones_buscar.php.
export default function PatronesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = PATRONES_MOCK.filter((p) => {
    const term = search.toLowerCase();
    return (
      !term ||
      p.idInterno.toLowerCase().includes(term) ||
      p.descripcion.toLowerCase().includes(term) ||
      p.certificado.toLowerCase().includes(term)
    );
  });

  const columns = [
    { field: "idInterno", headerName: "Id Interno" },
    { field: "categoria", headerName: "Categoría" },
    { field: "marca", headerName: "Marca" },
    { field: "modelo", headerName: "Modelo" },
    { field: "serie", headerName: "Serie" },
    { field: "descripcion", headerName: "Descripción" },
    {
      field: "fechaVencimiento",
      headerName: "Vigencia",
      renderCell: (row) => {
        const estado = estadoVigencia(row.fechaVencimiento);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {estado.color !== "success" && estado.color !== "default" && (
              <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: `${estado.color}.main` }} />
            )}
            <Typography variant="body2">{formatDate(row.fechaVencimiento)}</Typography>
          </Box>
        );
      },
    },
    {
      field: "estado",
      headerName: "Estado",
      renderCell: (row) => {
        const estado = estadoVigencia(row.fechaVencimiento);
        return <Chip label={estado.label} color={estado.color} size="small" />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Tooltip title="Editar patrón">
          <IconButton size="small" onClick={() => navigate(`/equipos/patrones/${row.id}/editar`)}>
            <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const vencidos = PATRONES_MOCK.filter((p) => diasParaVencer(p.fechaVencimiento) < 0).length;
  const porVencer = PATRONES_MOCK.filter((p) => {
    const d = diasParaVencer(p.fechaVencimiento);
    return d >= 0 && d < 45;
  }).length;

  const exportar = () => {
    exportCsv(
      PATRONES_MOCK.map((p) => ({
        IdInterno: p.idInterno, Categoria: p.categoria, Marca: p.marca, Modelo: p.modelo,
        Serie: p.serie, Descripcion: p.descripcion, FechaVencimiento: p.fechaVencimiento,
      })),
      "patrones.csv"
    );
  };

  return (
    <Box>
      <PageHeader
        icon={<StraightenOutlinedIcon />}
        title="Consultar Patrones"
        subtitle={
          <>
            {PATRONES_MOCK.length} patrones registrados
            {porVencer > 0 && <Box component="span" sx={{ color: "warning.main", fontWeight: 700 }}> · {porVencer} por vencer</Box>}
            {vencidos > 0 && <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}> · {vencidos} vencidos</Box>}
          </>
        }
        actions={
          <>
            <AppButton variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportar} sx={{ borderRadius: 2 }}>
              Exportar Patrones
            </AppButton>
            <AppButton startIcon={<AddIcon />} onClick={() => navigate("/equipos/patrones/nuevo")} sx={{ borderRadius: 2 }}>
              Alta de Patrón
            </AppButton>
          </>
        }
      />

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por ID interno, descripción o certificado..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 400, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
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

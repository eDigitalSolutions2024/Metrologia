import { useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import { formatDate } from "../../shared/utils/formatDate";

const STATUS_MAP = {
  vigente:     { label: "Vigente",     color: "success" },
  "por-vencer": { label: "Por Vencer", color: "warning" },
  vencido:     { label: "Vencido",     color: "error" },
};

const today = new Date();
function diasParaVencer(f) {
  if (!f) return null;
  return Math.ceil((new Date(f) - today) / 86400000);
}

const MOCK = [
  { id: 1,  codigo: "PAT-001", descripcion: "Juego de pesas clase E2",          marca: "Mettler Toledo", rango: "1 mg – 200 g",   incertidumbre: "0.05 mg",   laboratorio: "CENAM",        certificado: "CENAM-2024-001", vigencia: "2025-09-15", status: "vigente" },
  { id: 2,  codigo: "PAT-002", descripcion: "Bloque patrón acero grado 1",       marca: "Mitutoyo",      rango: "1–100 mm",        incertidumbre: "0.08 μm",   laboratorio: "NIM",          certificado: "NIM-2024-042",   vigencia: "2025-07-20", status: "por-vencer" },
  { id: 3,  codigo: "PAT-003", descripcion: "Termómetro de referencia SPT",      marca: "Fluke",         rango: "-200 – 660 °C",   incertidumbre: "0.01 °C",   laboratorio: "CENAM",        certificado: "CENAM-2024-089", vigencia: "2025-12-01", status: "vigente" },
  { id: 4,  codigo: "PAT-004", descripcion: "Calibrador de presión digital",     marca: "GE Druck",      rango: "0–700 bar",        incertidumbre: "0.02 bar",  laboratorio: "CENAM",        certificado: "CENAM-2024-110", vigencia: "2024-12-31", status: "vencido" },
  { id: 5,  codigo: "PAT-005", descripcion: "Multímetro de referencia 8.5 dig.", marca: "Fluke",         rango: "0–1000 V DC/AC",   incertidumbre: "5 μV",      laboratorio: "NIM",          certificado: "NIM-2024-078",   vigencia: "2025-10-10", status: "vigente" },
  { id: 6,  codigo: "PAT-006", descripcion: "Celda de carga de referencia",      marca: "HBM",           rango: "0–10 kN",          incertidumbre: "0.1 N",     laboratorio: "CENAM",        certificado: "CENAM-2024-135", vigencia: "2025-08-30", status: "por-vencer" },
  { id: 7,  codigo: "PAT-007", descripcion: "Higrómetro de referencia",          marca: "Rotronic",      rango: "0–100 %HR",        incertidumbre: "0.5 %HR",   laboratorio: "IMP",          certificado: "IMP-2024-021",   vigencia: "2025-11-15", status: "vigente" },
  { id: 8,  codigo: "PAT-008", descripcion: "Peine de frecuencia óptico",        marca: "Mensor",        rango: "0.1–1000 Hz",      incertidumbre: "0.001 Hz",  laboratorio: "CENAM",        certificado: "CENAM-2024-202", vigencia: "2025-09-01", status: "vigente" },
];

export default function PatronesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = MOCK.filter(
    (p) =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      p.certificado.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { field: "codigo",         headerName: "Código" },
    { field: "descripcion",    headerName: "Descripción" },
    { field: "marca",          headerName: "Marca" },
    { field: "rango",          headerName: "Rango" },
    { field: "incertidumbre",  headerName: "Incertidumbre" },
    { field: "laboratorio",    headerName: "Lab. Trazabilidad" },
    { field: "certificado",    headerName: "No. Certificado" },
    {
      field: "vigencia",
      headerName: "Vigencia",
      renderCell: (row) => {
        const dias = diasParaVencer(row.vigencia);
        const color = dias !== null && dias < 0 ? "error.main" : dias !== null && dias < 45 ? "warning.main" : "success.main";
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {dias !== null && dias < 45 && <WarningAmberOutlinedIcon sx={{ fontSize: 14, color }} />}
            <Typography variant="body2" sx={{ color }}>{formatDate(row.vigencia)}</Typography>
          </Box>
        );
      },
    },
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
      renderCell: () => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Ver certificado">
            <IconButton size="small">
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small">
              <EditOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const vencidos   = MOCK.filter((p) => p.status === "vencido").length;
  const porVencer  = MOCK.filter((p) => p.status === "por-vencer").length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Patrones de Referencia</Typography>
          <Typography variant="body2" color="text.secondary">
            {MOCK.length} patrones registrados
            {porVencer > 0 && <Box component="span" sx={{ color: "warning.main", fontWeight: 700 }}> · {porVencer} por vencer</Box>}
            {vencidos  > 0 && <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}> · {vencidos} vencidos</Box>}
          </Typography>
        </Box>
        <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }}>Nuevo Patrón</AppButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por código, descripción o certificado..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 400, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Chip, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import EtiquetaEquipoDialog from "../../shared/components/EtiquetaEquipoDialog";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { exportCsv } from "../../shared/utils/exportCsv";
import { listarPatrones, fetchQrPatronBlob } from "../../services/patrones";

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
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [etiquetaPatron, setEtiquetaPatron] = useState(null);

  useEffect(() => {
    setLoading(true);
    listarPatrones({ search, page, pageSize: 10 })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, page]);

  const columns = [
    { field: "codigo", headerName: "Id Interno" },
    { field: "categoria", headerName: "Categoría" },
    { field: "marca", headerName: "Marca" },
    { field: "modelo", headerName: "Modelo" },
    { field: "serie", headerName: "Serie" },
    { field: "descripcion", headerName: "Descripción" },
    {
      field: "vencimiento",
      headerName: "Vigencia",
      renderCell: (row) => {
        const fecha = row.ultimaCalibracion?.vencimiento;
        const estado = estadoVigencia(fecha);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {estado.color !== "success" && estado.color !== "default" && (
              <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: `${estado.color}.main` }} />
            )}
            <Typography variant="body2">{formatDate(fecha)}</Typography>
          </Box>
        );
      },
    },
    {
      field: "estado",
      headerName: "Estado",
      renderCell: (row) => {
        const estado = estadoVigencia(row.ultimaCalibracion?.vencimiento);
        return <Chip label={estado.label} color={estado.color} size="small" />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <>
          <Tooltip title="Editar patrón">
            <IconButton size="small" onClick={() => navigate(`/equipos/patrones/${row._id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Etiqueta / imprimir">
            <IconButton size="small" onClick={() => setEtiquetaPatron(row)}>
              <QrCode2OutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const vencidos = items.filter((p) => diasParaVencer(p.ultimaCalibracion?.vencimiento) < 0).length;
  const porVencer = items.filter((p) => {
    const d = diasParaVencer(p.ultimaCalibracion?.vencimiento);
    return d !== null && d >= 0 && d < 45;
  }).length;

  const exportar = () => {
    exportCsv(
      items.map((p) => ({
        IdInterno: p.codigo, Categoria: p.categoria, Marca: p.marca, Modelo: p.modelo,
        Serie: p.serie, Descripcion: p.descripcion, FechaVencimiento: p.ultimaCalibracion?.vencimiento ?? "",
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
            {total} patrones registrados
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
          placeholder="Buscar por ID interno, descripción o marca..."
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
        rows={items}
        totalCount={total}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        loading={loading}
      />

      <EtiquetaEquipoDialog
        open={!!etiquetaPatron}
        onClose={() => setEtiquetaPatron(null)}
        item={etiquetaPatron}
        tipo="patron"
        fetchQr={fetchQrPatronBlob}
      />
    </Box>
  );
}

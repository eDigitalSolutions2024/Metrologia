import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip,
  MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import EtiquetaEquipoDialog from "../../shared/components/EtiquetaEquipoDialog";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { exportCsv } from "../../shared/utils/exportCsv";
import { CATEGORIAS } from "./categorias";
import { listarPatrones, fetchQrPatronBlob } from "../../services/patrones";
import { useAuth } from "../../core/auth/useAuth";

const VIG = {
  vigente: { label: "Vigente", color: "success" },
  por_vencer: { label: "Por vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
  sin_fecha: { label: "Sin fecha", color: "default" },
};

export default function PatronesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeEditar = user?.rol !== "tecnico";
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [page, setPage] = useState(0);
  const [etiquetaPatron, setEtiquetaPatron] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    listarPatrones({ search, categoria, vigencia, page, pageSize: 10 })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, categoria, vigencia, page]);
  useEffect(() => { cargar(); }, [cargar]);

  const cuenta = (v) => rows.filter((r) => r.vigencia === v).length;

  const columns = [
    {
      field: "codigo", headerName: "Patrón",
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{r.codigo}</Typography>
          <Typography variant="caption" color="text.secondary">{r.nombre}</Typography>
        </Box>
      ),
    },
    { field: "categoria", headerName: "Categoría", renderCell: (r) => r.categoria || "—" },
    { field: "trazabilidad", headerName: "Trazabilidad", renderCell: (r) => r.trazabilidad || "—" },
    {
      field: "incertidumbre", headerName: "U (cert.)",
      renderCell: (r) =>
        r.incertidumbre?.modo === "tabla"
          ? <Chip size="small" variant="outlined" label={`tabla · ${r.incertidumbre.puntos?.length || 0} pts`} />
          : r.incertidumbre?.valor != null
          ? <span>{r.incertidumbre.valor} {r.incertidumbre.unidad || r.unidad} <Typography component="span" variant="caption" color="text.secondary">k={r.incertidumbre.k}</Typography></span>
          : "—",
    },
    { field: "venc", headerName: "Vence", renderCell: (r) => formatDate(r.calibracion?.vencimiento) },
    {
      field: "vigencia", headerName: "Estado",
      renderCell: (r) => {
        const v = VIG[r.vigencia] || VIG.sin_fecha;
        return <Chip size="small" label={v.label} color={v.color} />;
      },
    },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <>
          {puedeEditar && (
            <Tooltip title="Editar patrón">
              <IconButton size="small" onClick={() => navigate(`/equipos/patrones/${r._id}/editar`)}>
                <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Etiqueta / imprimir">
            <IconButton size="small" onClick={() => setEtiquetaPatron(r)}>
              <QrCode2OutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const exportar = () =>
    exportCsv(
      rows.map((r) => ({
        Codigo: r.codigo, Nombre: r.nombre, Categoria: r.categoria, Trazabilidad: r.trazabilidad,
        U: r.incertidumbre?.valor ?? "", k: r.incertidumbre?.k ?? "",
        Vence: r.calibracion?.vencimiento?.slice?.(0, 10) || "", Estado: r.vigencia,
      })),
      "patrones.csv"
    );

  return (
    <Box>
      <PageHeader
        icon={<StraightenOutlinedIcon />}
        title="Consultar Patrones"
        subtitle={`${total} patrones registrados`}
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

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" }, gap: 2.5, mb: 3.5 }}>
        <StatCard label="Vigentes (página)" value={cuenta("vigente")} icon={<VerifiedOutlinedIcon />} color="#16A34A" />
        <StatCard label="Por vencer" value={cuenta("por_vencer")} icon={<ScheduleOutlinedIcon />} color="#D97706" />
        <StatCard label="Vencidos" value={cuenta("vencido")} icon={<ReportGmailerrorredOutlinedIcon />} color="#DC2626" />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por código, nombre o N° de certificado…"
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 360, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todas</MenuItem>
            {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Vigencia</InputLabel>
          <Select label="Vigencia" value={vigencia} onChange={(e) => { setVigencia(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="vigente">Vigente</MenuItem>
            <MenuItem value="por_vencer">Por vencer</MenuItem>
            <MenuItem value="vencido">Vencido</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={total}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        emptyText="Sin patrones registrados"
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

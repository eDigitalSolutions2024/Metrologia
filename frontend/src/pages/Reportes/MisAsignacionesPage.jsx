import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Chip, Tooltip, IconButton, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";

import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import { useAuth } from "../../core/auth/useAuth";
import { listarAsignaciones } from "../../services/reportes";
import { usePolling } from "../../shared/hooks/usePolling";

const EST_CALIBRACION = { pendiente: "Pendiente", en_proceso: "En proceso", terminada: "Terminada" };
const EST_CALIBRACION_COLOR = { pendiente: "default", en_proceso: "warning", terminada: "success" };
const EST_CERTIFICADO_COLOR = { sin_generar: "default", en_revision: "warning", autorizado: "success", rechazado: "error" };

export default function MisAsignacionesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendientes"); // pendientes | todas
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const cargar = useCallback((silencioso = false) => {
    if (!userId) return;
    if (!silencioso) setLoading(true);
    // El filtro "pendientes" (no-terminada) se aplica en cliente porque el
    // backend no tiene un operador "distinto de" para estadoCalibracion.
    listarAsignaciones({ tecnicoAsignado: userId, page, pageSize: rowsPerPage })
      .then(({ items, total }) => {
        const filtrados = filtro === "pendientes"
          ? items.filter((a) => a.estados?.calibracion !== "terminada")
          : items;
        setRows(filtrados);
        setTotal(filtro === "pendientes" ? filtrados.length : total);
      })
      .catch(() => { if (!silencioso) { setRows([]); setTotal(0); } })
      .finally(() => { if (!silencioso) setLoading(false); });
  }, [userId, filtro, page, rowsPerPage]);
  useEffect(() => { cargar(); }, [cargar]);
  usePolling(() => cargar(true));

  const abrir = (r) => { if (r.reporte?._id) navigate(`/reportes/${r.reporte._id}`); };

  const columns = [
    {
      field: "reporte", headerName: "Reporte", minWidth: 170,
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{r.reporte?.folio || "—"}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{r.reporte?.cliente?.nombre || "—"}</Typography>
        </Box>
      ),
    },
    {
      field: "equipo", headerName: "Equipo", minWidth: 180,
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{r.equipo?.idInterno || "—"}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{r.equipo?.descripcion || ""}</Typography>
        </Box>
      ),
    },
    {
      field: "marca", headerName: "Marca / Modelo", minWidth: 140, hideBelow: 900,
      renderCell: (r) => [r.equipo?.marca, r.equipo?.modelo].filter(Boolean).join(" ") || "—",
    },
    {
      field: "calibracion", headerName: "Calibración", nowrap: true,
      renderCell: (r) => (
        <Chip size="small" label={EST_CALIBRACION[r.estados?.calibracion] || r.estados?.calibracion}
          color={EST_CALIBRACION_COLOR[r.estados?.calibracion] || "default"} />
      ),
    },
    {
      field: "certificado", headerName: "Certificado", nowrap: true,
      renderCell: (r) => (
        <Chip size="small" label={r.estados?.certificado?.replace("_", " ") || "—"}
          color={EST_CERTIFICADO_COLOR[r.estados?.certificado] || "default"}
          sx={{ textTransform: "capitalize" }} />
      ),
    },
    {
      field: "acciones", headerName: "Acciones", align: "center", nowrap: true,
      renderCell: (r) => (
        <Tooltip title="Abrir reporte">
          <IconButton size="small" onClick={() => abrir(r)}>
            <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<EngineeringOutlinedIcon />}
        title="Mis Asignaciones"
        subtitle={`${total} ${filtro === "pendientes" ? "pendientes" : "en total"}`}
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Mostrar</InputLabel>
          <Select label="Mostrar" value={filtro} onChange={(e) => { setFiltro(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="pendientes">Pendientes (sin terminar)</MenuItem>
            <MenuItem value="todas">Todas mis asignaciones</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns} rows={rows} loading={loading}
        totalCount={total} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        onRowClick={abrir}
        emptyText={filtro === "pendientes" ? "No tienes asignaciones pendientes." : "Todavía no tienes asignaciones."}
      />

      {rows.length === 0 && !loading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Aquí aparecen los equipos que te asignaron para calibrar. Ábrelos para capturar los datos y avanzar el estado.
        </Typography>
      )}
    </Box>
  );
}

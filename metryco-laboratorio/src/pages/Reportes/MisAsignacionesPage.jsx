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

  const cargar = useCallback(() => {
    if (!userId) return;
    setLoading(true);
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
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [userId, filtro, page, rowsPerPage]);
  useEffect(() => { cargar(); }, [cargar]);

  const columns = [
    { field: "reporte", headerName: "Reporte", renderCell: (r) => r.reporte?.folio || "—" },
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.reporte?.cliente?.nombre || "—" },
    { field: "equipo", headerName: "Equipo", renderCell: (r) => `${r.equipo?.idInterno || "—"} — ${r.equipo?.descripcion || ""}` },
    { field: "marca", headerName: "Marca/Modelo", renderCell: (r) => `${r.equipo?.marca || "—"} ${r.equipo?.modelo || ""}` },
    {
      field: "calibracion", headerName: "Calibración",
      renderCell: (r) => (
        <Chip size="small" label={EST_CALIBRACION[r.estados?.calibracion] || r.estados?.calibracion}
          color={EST_CALIBRACION_COLOR[r.estados?.calibracion] || "default"} />
      ),
    },
    {
      field: "certificado", headerName: "Certificado",
      renderCell: (r) => (
        <Chip size="small" label={r.estados?.certificado?.replace("_", " ") || "—"}
          color={EST_CERTIFICADO_COLOR[r.estados?.certificado] || "default"} />
      ),
    },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <Tooltip title="Abrir reporte">
          <IconButton size="small" onClick={() => navigate(`/reportes/${r.reporte?._id}`)}>
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

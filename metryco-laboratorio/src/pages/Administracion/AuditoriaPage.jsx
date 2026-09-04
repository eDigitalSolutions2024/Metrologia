import { useEffect, useState } from "react";
import {
  Box, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Typography,
} from "@mui/material";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import { listarAuditoria } from "../../services/auditoria";

const ACCIONES = [
  "login_exitoso", "login_fallido", "permiso_denegado",
  "usuario_creado", "usuario_editado", "usuario_desactivado", "usuario_eliminado",
  "equipo_eliminado", "patron_eliminado", "cotizacion_eliminada",
  "factura_pagada", "factura_reabierta", "factura_eliminada",
  "certificado_anulado", "permisos_menu_actualizados",
];

const ACCION_LABEL = {
  login_exitoso: "Inicio de sesión", login_fallido: "Login fallido", permiso_denegado: "Permiso denegado",
  usuario_creado: "Usuario creado", usuario_editado: "Usuario editado",
  usuario_desactivado: "Usuario desactivado", usuario_eliminado: "Usuario eliminado",
  equipo_eliminado: "Equipo eliminado", patron_eliminado: "Patrón eliminado",
  cotizacion_eliminada: "Cotización eliminada", factura_pagada: "Factura pagada",
  factura_reabierta: "Factura reabierta", factura_eliminada: "Factura eliminada",
  certificado_anulado: "Certificado anulado", permisos_menu_actualizados: "Permisos del menú actualizados",
};

function formatFecha(f) {
  return f ? new Date(f).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "—";
}

export default function AuditoriaPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [accion, setAccion] = useState("");
  const [usuario, setUsuario] = useState("");
  const [buscarUsuario, setBuscarUsuario] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    setLoading(true);
    listarAuditoria({ accion, usuario: buscarUsuario, exito, page, pageSize: 25 })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [accion, buscarUsuario, exito, page]);

  const columns = [
    { field: "fecha", headerName: "Fecha", renderCell: (r) => formatFecha(r.fecha) },
    { field: "accion", headerName: "Acción", renderCell: (r) => ACCION_LABEL[r.accion] || r.accion },
    { field: "usuario", headerName: "Usuario", renderCell: (r) => r.usuario?.usuario || "—" },
    { field: "rol", headerName: "Rol", renderCell: (r) => r.usuario?.rol || "—" },
    {
      field: "exito", headerName: "Resultado", align: "center",
      renderCell: (r) => <Chip label={r.exito ? "OK" : "Falló"} color={r.exito ? "success" : "error"} size="small" />,
    },
    { field: "ip", headerName: "IP" },
  ];

  return (
    <Box>
      <PageHeader
        icon={<HistoryOutlinedIcon />}
        title="Auditoría"
        subtitle="Registro de inicios de sesión y acciones sensibles del sistema"
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Buscar por usuario..."
          size="small"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setBuscarUsuario(usuario); } }}
          sx={{ width: 240, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Acción</InputLabel>
          <Select label="Acción" value={accion} onChange={(e) => { setAccion(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todas</MenuItem>
            {ACCIONES.map((a) => <MenuItem key={a} value={a}>{ACCION_LABEL[a]}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Resultado</InputLabel>
          <Select label="Resultado" value={exito} onChange={(e) => { setExito(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Exitosos</MenuItem>
            <MenuItem value="false">Fallidos</MenuItem>
          </Select>
        </FormControl>
        <AppButton variant="outlined" onClick={() => { setPage(0); setBuscarUsuario(usuario); }} sx={{ borderRadius: 2 }}>Buscar</AppButton>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{total} eventos registrados</Typography>

      <AppTable
        columns={columns}
        rows={items}
        totalCount={total}
        page={page}
        rowsPerPage={25}
        onPageChange={setPage}
        loading={loading}
        emptyText="Sin eventos para este filtro"
      />
    </Box>
  );
}

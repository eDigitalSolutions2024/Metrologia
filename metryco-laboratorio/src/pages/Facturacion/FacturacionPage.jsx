import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Chip, MenuItem, Select, FormControl, InputLabel, Alert } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { listarClientes } from "../../services/clientes";
import { listarCfdi } from "../../services/cfdi";
import CrearCfdiDialog from "./CrearCfdiDialog";
import CfdiDetalleDialog from "./CfdiDetalleDialog";
import { ESTADO_CFDI_CHIP } from "./estadosCfdi";

export default function FacturacionPage() {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [crearOpen, setCrearOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    listarCfdi({ clienteId, estado, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => setError("No se pudieron cargar los comprobantes."))
      .finally(() => setLoading(false));
  }, [clienteId, estado, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { listarClientes({ pageSize: 300 }).then(({ items }) => setClientes(items)).catch(() => {}); }, []);

  const stats = [
    { t: "Total", v: total, icon: <ReceiptLongOutlinedIcon />, color: theme.palette.secondary.main },
    { t: "Borrador", v: rows.filter((r) => r.estado === "borrador").length, icon: <PendingActionsOutlinedIcon />, color: theme.palette.info.main },
    { t: "Timbradas", v: rows.filter((r) => r.estado === "timbrada").length, icon: <VerifiedOutlinedIcon />, color: theme.palette.success.main },
    { t: "Error / canceladas", v: rows.filter((r) => ["error_timbrado", "cancelada"].includes(r.estado)).length, icon: <ReportProblemOutlinedIcon />, color: theme.palette.error.main },
  ];

  const columns = [
    {
      field: "folio", headerName: "Comprobante",
      renderCell: (r) => (
        <Box component="button" type="button" onClick={() => setDetalle(r)} sx={{ border: "none", background: "none", p: 0, cursor: "pointer", textAlign: "left" }}>
          <Typography variant="body2" fontWeight={700} color="secondary.main">{r.folioInterno}</Typography>
          {r.uuid && <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>{r.uuid}</Typography>}
        </Box>
      ),
    },
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.cliente?.nombre || "—" },
    { field: "rfc", headerName: "RFC", renderCell: (r) => r.receptor?.rfc || "—" },
    { field: "fecha", headerName: "Fecha", renderCell: (r) => formatDate(r.createdAt) },
    { field: "total", headerName: "Total", renderCell: (r) => <Typography fontWeight={700} fontSize={13}>{formatCurrency(r.total)}</Typography> },
    {
      field: "estado", headerName: "Estado",
      renderCell: (r) => {
        const s = ESTADO_CFDI_CHIP[r.estado] || { label: r.estado, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<ReceiptLongOutlinedIcon />}
        title="Facturación (CFDI)"
        subtitle={`${total} comprobantes · Etapa 2 — requiere PAC configurado para timbrar de verdad`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => setCrearOpen(true)} sx={{ borderRadius: 2 }}>
            Nuevo comprobante
          </AppButton>
        }
      />

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        Esta pantalla es distinta de <b>Cuentas por Cobrar</b> (Cobranza): ahí se lleva el control de qué se cobró
        y cuándo; aquí se genera el comprobante fiscal (CFDI) formal ante el SAT.
      </Alert>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 2.5, mb: 3.5 }}>
        {stats.map((s) => <StatCard key={s.t} label={s.t} value={s.v} icon={s.icon} color={s.color} />)}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Cliente</InputLabel>
          <Select label="Cliente" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADO_CFDI_CHIP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows.map((r) => ({ ...r, id: r._id }))}
        loading={loading}
        totalCount={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        emptyText="Sin comprobantes fiscales"
      />

      <CrearCfdiDialog
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreado={(cfdi) => { setCrearOpen(false); cargar(); setDetalle(cfdi); }}
      />
      <CfdiDetalleDialog
        cfdi={detalle}
        onClose={() => setDetalle(null)}
        onCambiado={(actualizado) => { setDetalle(actualizado); cargar(); }}
      />
    </Box>
  );
}

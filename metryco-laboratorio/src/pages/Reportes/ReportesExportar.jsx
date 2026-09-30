import { useEffect, useState } from "react";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel,
  Paper, ToggleButtonGroup, ToggleButton, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useNavigate } from "react-router-dom";

import AppButton from "../../shared/components/AppButton";
import { formatDate } from "../../shared/utils/formatDate";
import { exportCsv } from "../../shared/utils/exportCsv";
import { listarClientes } from "../../services/clientes";
import { exportarCertificados } from "../../services/certificados";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ANIO_ACTUAL = new Date().getFullYear();
const YEARS = ["", ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3];

export default function ReportesExportar() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState("");
  const [factura, setFactura] = useState("todos");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listarClientes({ pageSize: 500 }).then(({ items }) => setClientes(items)).catch(() => {});
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setError("");
    try {
      const mesIdx = mes ? MESES.indexOf(mes) : "";
      const items = await exportarCertificados({ clienteId: cliente, mes: mesIdx, anio, factura });
      if (items.length === 0) {
        setError("No hay certificados que coincidan con esos filtros.");
        return;
      }
      exportCsv(
        items.map((c) => ({
          Folio: c.folio,
          Cliente: c.cliente?.nombre || c.clienteSnapshot?.nombre || "",
          Equipo: c.equipoSnapshot?.idInterno || "",
          Descripcion: c.equipoSnapshot?.descripcion || "",
          FechaEmision: formatDate(c.fechaEmision),
          Estado: c.estadoEfectivo || c.estado,
          ReporteServicio: c.reporte?.folio || "",
          Factura: c.reporte?.factura || "",
        })),
        `certificados_${anio || "todos"}${mes ? "_" + mes : ""}.csv`
      );
    } catch {
      setError("No se pudo generar la exportación. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3.5 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/reportes")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>Exportar Certificados</Typography>
          <Typography variant="body2" color="text.secondary">Filtra y descarga los certificados de calibración (CSV)</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3 }}>
              <Box
                sx={{
                  width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
                  bgcolor: theme.palette.secondary.main + "18", color: "secondary.main",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <FilterAltOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>Filtros de exportación</Typography>
                <Typography variant="body2" color="text.secondary">Acota el rango antes de generar el archivo</Typography>
              </Box>
            </Box>

            {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Cliente (opcional)</InputLabel>
                  <Select label="Cliente (opcional)" value={cliente} onChange={(e) => setCliente(e.target.value)} sx={{ borderRadius: 2 }}>
                    <MenuItem value="">Todos los clientes</MenuItem>
                    {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Mes</InputLabel>
                  <Select label="Mes" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ borderRadius: 2 }}>
                    {MESES.map((m, i) => <MenuItem key={i} value={m}>{m || "Todos los meses"}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Año</InputLabel>
                  <Select label="Año" value={anio} onChange={(e) => setAnio(e.target.value)} sx={{ borderRadius: 2 }}>
                    {YEARS.map((y) => <MenuItem key={y} value={y}>{y || "Todos los años"}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                  Con factura
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={factura}
                  onChange={(_, v) => v && setFactura(v)}
                  size="small"
                  sx={{
                    "& .MuiToggleButton-root": {
                      borderRadius: 2, textTransform: "none", fontWeight: 600, px: 2.5,
                      "&.Mui-selected": { bgcolor: "secondary.main", color: "#fff", "&:hover": { bgcolor: "secondary.dark" } },
                    },
                  }}
                >
                  <ToggleButton value="todos">Todos</ToggleButton>
                  <ToggleButton value="con">Con factura</ToggleButton>
                  <ToggleButton value="sin">Sin factura</ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
                  <AppButton variant="outlined" onClick={() => navigate("/reportes")} sx={{ borderRadius: 2 }}>
                    Cancelar
                  </AppButton>
                  <AppButton
                    loading={loading}
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={handleExport}
                    sx={{ borderRadius: 2, bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
                  >
                    Exportar
                  </AppButton>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5, borderRadius: 2, border: 1, borderColor: "divider",
              height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 2,
            }}
          >
            <Box
              sx={{
                width: 64, height: 64, borderRadius: 3,
                bgcolor: theme.palette.success.main + "18", color: "success.main",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ReceiptLongOutlinedIcon sx={{ fontSize: 34 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Vista previa de exportación</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 280 }}>
                Se descargará un CSV con los certificados que coincidan con los filtros seleccionados a la izquierda (folio, cliente, equipo, fecha, estado, reporte y factura).
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

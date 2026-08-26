import { useState } from "react";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel,
  Paper, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useNavigate } from "react-router-dom";

import AppButton from "../../shared/components/AppButton";

const CLIENTES = [
  "", "AUDI MEXICO SA DE CV", "FOXCONN INDUSTRIAL INTERNET", "ASSA ABLOY MEXICO",
  "BOMBARDIER CHIHUAHUA", "HONEYWELL AEROSPACE",
];

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const YEARS = ["", "2023", "2024", "2025", "2026"];

export default function ReportesExportar() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [cliente, setCliente] = useState("");
  const [factura, setFactura] = useState("todos");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3.5 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/reportes")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>Exportar Certificados</Typography>
          <Typography variant="body2" color="text.secondary">Filtra y descarga los certificados de calibración</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: 1, borderColor: "divider" }}>
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

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Cliente (opcional)</InputLabel>
                  <Select label="Cliente (opcional)" value={cliente} onChange={(e) => setCliente(e.target.value)} sx={{ borderRadius: 2 }}>
                    {CLIENTES.map((c) => <MenuItem key={c} value={c}>{c || "Todos los clientes"}</MenuItem>)}
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
              p: 3.5, borderRadius: 3, border: 1, borderColor: "divider",
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
                Se generará un archivo con los certificados que coincidan con los filtros seleccionados a la izquierda.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

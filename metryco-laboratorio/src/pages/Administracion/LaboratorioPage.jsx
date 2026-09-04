import { useEffect, useRef, useState } from "react";
import { Box, TextField, Alert, Paper, Grid, Typography, Avatar } from "@mui/material";
import DomainOutlinedIcon from "@mui/icons-material/DomainOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import {
  obtenerLaboratorio, actualizarLaboratorio,
  obtenerLogo, subirLogo, eliminarLogo, logoUrl,
} from "../../services/configuracion";
import { useLogoMarca } from "../../theme/AppThemeProvider";

const CAMPOS = [
  { key: "nombre", label: "Nombre del laboratorio", placeholder: "Ej. Laboratorio de Metrología y Consultoría", md: 12 },
  { key: "rfc", label: "RFC", placeholder: "Ej. ROMM810601FN5", md: 6 },
  { key: "acreditacion", label: "Acreditación", placeholder: "Ej. EMA (opcional)", md: 6 },
  { key: "domicilio", label: "Domicilio", placeholder: "Calle, colonia, ciudad, CP", md: 12 },
  { key: "telefono", label: "Teléfono", placeholder: "Ej. 656-123-4567", md: 6 },
];

const VACIO = { nombre: "", acreditacion: "", rfc: "", domicilio: "", telefono: "" };

function LogoCard({ setError }) {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);
  const { refrescarLogo } = useLogoMarca();

  const cargar = () => {
    obtenerLogo().then(setLogo).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const elegirArchivo = () => inputRef.current?.click();

  const onArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si se necesita
    if (!archivo) return;
    setSubiendo(true); setError("");
    try {
      await subirLogo(archivo);
      cargar();
      refrescarLogo(); // refleja el cambio en Sidebar/Login al instante, sin recargar
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo subir el logo.");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    setSubiendo(true); setError("");
    try {
      await eliminarLogo();
      setLogo(null);
      refrescarLogo();
    } catch {
      setError("No se pudo quitar el logo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", maxWidth: 720, mb: 2.5 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Logotipo</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
        <Avatar variant="rounded" src={logo ? logoUrl(logo.nombreArchivo) : undefined} sx={{ width: 64, height: 64, borderRadius: "10px", bgcolor: "background.default", border: 1, borderColor: "divider" }}>
          <ImageOutlinedIcon color="disabled" />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? "Cargando…" : logo ? "Se usa en el menú, el login y los PDFs." : "Sin logo — se usa el ícono genérico del sistema."}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <AppButton variant="outlined" size="small" startIcon={<UploadOutlinedIcon />} onClick={elegirArchivo} disabled={subiendo} sx={{ borderRadius: "10px" }}>
            {logo ? "Cambiar" : "Subir logo"}
          </AppButton>
          {logo && (
            <AppButton variant="outlined" color="error" size="small" startIcon={<DeleteOutlineIcon />} onClick={quitar} disabled={subiendo} sx={{ borderRadius: "10px" }}>
              Quitar
            </AppButton>
          )}
        </Box>
      </Box>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={onArchivo} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        PNG, JPG, SVG o WEBP — máximo 3 MB.
      </Typography>
    </Paper>
  );
}

export default function LaboratorioPage() {
  const [datos, setDatos] = useState(VACIO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    obtenerLaboratorio()
      .then(setDatos)
      .catch(() => setError("No se pudieron cargar los datos guardados."))
      .finally(() => setLoading(false));
  }, []);

  const cambiar = (key, value) => {
    setGuardado(false);
    setDatos((prev) => ({ ...prev, [key]: value }));
  };

  const guardar = async () => {
    setSaving(true); setError(""); setGuardado(false);
    try {
      await actualizarLaboratorio(datos);
      setGuardado(true);
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<DomainOutlinedIcon />}
        title="Datos del Laboratorio"
        subtitle="Logo, nombre, RFC, domicilio y teléfono que aparecen en el menú, el login y los PDFs"
        actions={<AppButton loading={saving} onClick={guardar} sx={{ borderRadius: "10px" }}>Guardar cambios</AppButton>}
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setError("")}>{error}</Alert>}
      {guardado && <Alert severity="success" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setGuardado(false)}>Datos guardados.</Alert>}

      <LogoCard setError={setError} />

      <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", maxWidth: 720 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Cargando…</Typography>
        ) : (
          <Grid container spacing={2.5}>
            {CAMPOS.map((c) => (
              <Grid key={c.key} size={{ xs: 12, md: c.md }}>
                <TextField
                  fullWidth size="small" label={c.label} placeholder={c.placeholder}
                  value={datos[c.key] || ""} onChange={(e) => cambiar(c.key, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
}

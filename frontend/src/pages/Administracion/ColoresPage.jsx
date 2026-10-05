import { useEffect, useState } from "react";
import { Box, Alert, Paper, Grid, Typography, Stack, Chip } from "@mui/material";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { obtenerColores, actualizarColores } from "../../services/configuracion";
import { COLORES_MARCA_DEFAULT } from "../../theme/theme";
import { useColoresMarca } from "../../theme/AppThemeProvider";

const CAMPOS = [
  { key: "primario", label: "Color primario", ayuda: "Sidebar y botones principales." },
  { key: "secundario", label: "Color de acción", ayuda: "Botones de acción, enlaces y foco de campos." },
  { key: "acento", label: "Color informativo", ayuda: "Chips y detalles informativos (estado, etiquetas)." },
];

function SelectorColor({ label, ayuda, value, onChange }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: "12px", display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 10, cursor: "pointer", padding: 0, background: "none" }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{ayuda}</Typography>
        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

export default function ColoresPage() {
  const [colores, setColores] = useState(COLORES_MARCA_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const { refrescarColores } = useColoresMarca();

  useEffect(() => {
    obtenerColores()
      .then(setColores)
      .catch(() => setError("No se pudieron cargar los colores guardados."))
      .finally(() => setLoading(false));
  }, []);

  const cambiar = (key, value) => {
    setGuardado(false);
    setColores((prev) => ({ ...prev, [key]: value }));
  };

  const guardar = async () => {
    setSaving(true); setError(""); setGuardado(false);
    try {
      const actualizados = await actualizarColores(colores);
      setColores(actualizados);
      refrescarColores();
      setGuardado(true);
    } catch {
      setError("No se pudieron guardar los colores.");
    } finally {
      setSaving(false);
    }
  };

  const restaurar = () => {
    setGuardado(false);
    setColores(COLORES_MARCA_DEFAULT);
  };

  return (
    <Box>
      <PageHeader
        icon={<PaletteOutlinedIcon />}
        title="Colores de la Interfaz"
        subtitle="Color primario y de acento del sistema — se aplican de inmediato a todos los usuarios"
        actions={
          <Stack direction="row" spacing={1}>
            <AppButton variant="outlined" startIcon={<RestartAltOutlinedIcon />} onClick={restaurar} disabled={saving} sx={{ borderRadius: "10px" }}>
              Restaurar default
            </AppButton>
            <AppButton loading={saving} onClick={guardar} sx={{ borderRadius: "10px" }}>Guardar cambios</AppButton>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setError("")}>{error}</Alert>}
      {guardado && <Alert severity="success" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setGuardado(false)}>Colores guardados y aplicados.</Alert>}

      {loading ? (
        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
      ) : (
        <Grid container spacing={2.5} sx={{ maxWidth: 1000 }}>
          {CAMPOS.map((c) => (
            <Grid key={c.key} size={{ xs: 12, sm: 6, md: 4 }}>
              <SelectorColor label={c.label} ayuda={c.ayuda} value={colores[c.key] || COLORES_MARCA_DEFAULT[c.key]} onChange={(v) => cambiar(c.key, v)} />
            </Grid>
          ))}
        </Grid>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", maxWidth: 1000, mt: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Vista previa</Typography>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <AppButton variant="contained" color="primary" sx={{ borderRadius: "10px" }}>Botón primario</AppButton>
          <AppButton variant="contained" color="secondary" sx={{ borderRadius: "10px" }}>Botón de acción</AppButton>
          <AppButton variant="outlined" sx={{ borderRadius: "10px" }}>Botón secundario</AppButton>
          <Chip label="Estado informativo" color="info" />
        </Stack>
      </Paper>
    </Box>
  );
}

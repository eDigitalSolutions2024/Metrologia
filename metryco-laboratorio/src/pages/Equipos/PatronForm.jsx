import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel, Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import AppDatePicker from "../../shared/components/AppDatePicker";
import { CATEGORIAS } from "./categorias";
import { PATRONES_MOCK } from "./mockData";

// Refleja php/npatron.php: Información General + Verificación y Mantenimiento
// (manejo/proceso/transporte/almacenamiento) + certificado PDF.
export default function PatronForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const patronActual = isEdit ? PATRONES_MOCK.find((p) => String(p.id) === id) : null;

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: patronActual ?? {},
  });

  const onSubmit = (data) => {
    // Sin backend de Patrones todavía (ver memoria del proyecto): se simula el guardado.
    console.log(data);
    navigate("/equipos/patrones");
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/equipos/patrones")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{isEdit ? "Edición de Patrón" : "Alta de Patrón"}</Typography>
          <Typography variant="body2" color="text.secondary">Patrón de referencia trazable del laboratorio</Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Información General" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="ID Interno" error={errors.idInterno} {...register("idInterno", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" defaultValue={patronActual?.categoria ?? ""} {...register("categoria")} sx={{ borderRadius: 2 }}>
                  {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <AppInput label="Certificado de calibración" error={errors.certificado} {...register("certificado", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Marca" {...register("marca")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Modelo" error={errors.modelo} {...register("modelo", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Serie" error={errors.serie} {...register("serie", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AppInput label="Descripción" error={errors.descripcion} {...register("descripcion", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Trazabilidad" error={errors.trazabilidad} {...register("trazabilidad", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Comentarios" {...register("comentarios")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                name="fechaCalibracion"
                control={control}
                rules={{ required: "Obligatorio" }}
                render={({ field }) => (
                  <AppDatePicker label="Fecha de calibración" error={errors.fechaCalibracion} {...field} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                name="fechaVencimiento"
                control={control}
                rules={{ required: "Obligatorio" }}
                render={({ field }) => (
                  <AppDatePicker label="Fecha de vencimiento" error={errors.fechaVencimiento} {...field} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Unidades" {...register("unidades")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Capacidad" error={errors.capacidad} {...register("capacidad", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="División mínima" {...register("divMin")} />
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon />}
                sx={{ borderRadius: 2, height: 40 }}
              >
                Importar certificado (PDF)
                <input type="file" accept="application/pdf" hidden {...register("filePdf")} />
              </Button>
              {patronActual?.filePdf && (
                <AppButton
                  variant="text"
                  startIcon={<DescriptionOutlinedIcon />}
                  sx={{ ml: 2 }}
                  onClick={() => window.open(`/${patronActual.filePdf}`, "_blank")}
                >
                  Ver archivo actual
                </AppButton>
              )}
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Verificación y Mantenimiento" sx={{ mb: 3 }}>
          <AppInput label="Manejo" multiline minRows={2} {...register("manejo")} />
        </AppCard>

        <AppCard title="Procedimiento" sx={{ mb: 3 }}>
          <AppInput label="Proceso" multiline minRows={2} {...register("proceso")} />
        </AppCard>

        <AppCard title="Transporte y almacenamiento" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Transporte" multiline minRows={2} {...register("transporte")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Almacenamiento" multiline minRows={2} {...register("almacenamiento")} />
            </Grid>
          </Grid>
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton variant="outlined" onClick={() => navigate("/equipos/patrones")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Patrón"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

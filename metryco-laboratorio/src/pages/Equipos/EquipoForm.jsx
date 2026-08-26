import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import AppDatePicker from "../../shared/components/AppDatePicker";

export default function EquipoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { register, control, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    navigate("/equipos");
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/equipos")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{isEdit ? "Editar Equipo" : "Alta de Equipo"}</Typography>
          <Typography variant="body2" color="text.secondary">Registra las características del equipo de medición</Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Identificación" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Código interno" error={errors.codigo} {...register("codigo", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <AppInput label="Descripción del equipo" error={errors.descripcion} {...register("descripcion", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" defaultValue="activo" {...register("status")} sx={{ borderRadius: 2 }}>
                  <MenuItem value="activo">Activo</MenuItem>
                  <MenuItem value="calibracion">En Calibración</MenuItem>
                  <MenuItem value="baja">Baja</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Datos Técnicos" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Marca" {...register("marca")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Modelo" {...register("modelo")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="No. de Serie" {...register("serie")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="No. de Inventario" {...register("inventario")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Rango de medición" {...register("rango")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Resolución / Apreciación" {...register("resolucion")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Unidad de medida" {...register("unidad")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Calibración" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="fechaCalibración"
                control={control}
                render={({ field, fieldState }) => (
                  <AppDatePicker
                    label="Fecha última calibración"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="proximaCalibración"
                control={control}
                render={({ field, fieldState }) => (
                  <AppDatePicker
                    label="Próxima calibración"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Frecuencia (meses)" type="number" {...register("frecuencia")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Laboratorio de calibración" {...register("laboratorio")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="No. de certificado" {...register("certificado")} />
            </Grid>
          </Grid>
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton variant="outlined" onClick={() => navigate("/equipos")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Registrar Equipo"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { Box, Typography, Grid, IconButton, Tooltip, Button, Divider } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { MOCK } from "./mockData";

const PUNTO_VACIO = {
  prueba: "", nominal: "", unidad: "", escala: "", rdg: "", fs: "", unidades: "", incertidumbre: "",
  minimo: "", minimoReal: "", maximo: "", maximoReal: "",
};

// Réplica de la fórmula de php/input_form.php (calcula_/calcula_real_):
// tolerancia = nominal*rdg*0.01 + escala*fs*0.01 + unidades
// minimo/maximo = nominal -/+ tolerancia; luego se ajustan con la incertidumbre.
function calcularTolerancias(punto) {
  const nominal = parseFloat(punto.nominal);
  const escala = parseFloat(punto.escala);
  const rdg = parseFloat(punto.rdg);
  const fs = parseFloat(punto.fs);
  const unidades = parseFloat(punto.unidades);
  const incertidumbre = parseFloat(punto.incertidumbre);

  if ([nominal, escala, rdg, fs, unidades].some(Number.isNaN)) return punto;

  const tolerancia = nominal * rdg * 0.01 + escala * fs * 0.01 + unidades;
  const minimo = nominal - tolerancia;
  const maximo = nominal + tolerancia;

  return {
    ...punto,
    minimo: minimo.toFixed(4),
    maximo: maximo.toFixed(4),
    minimoReal: Number.isNaN(incertidumbre) ? "" : (minimo + incertidumbre).toFixed(4),
    maximoReal: Number.isNaN(incertidumbre) ? "" : (maximo - incertidumbre).toFixed(4),
  };
}

export default function PerformanceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const actual = isEdit ? MOCK.find((p) => String(p.id) === id) : null;

  const { register, control, handleSubmit, getValues, setValue, formState: { errors } } = useForm({
    defaultValues: actual
      ? { nombre: actual.nombre, comentarios: actual.comentarios, puntos: actual.puntos }
      : { nombre: "", comentarios: "", puntos: [PUNTO_VACIO] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "puntos" });

  const recalcularFila = (index) => {
    const actual = getValues(`puntos.${index}`);
    const calculado = calcularTolerancias(actual);
    setValue(`puntos.${index}.minimo`, calculado.minimo);
    setValue(`puntos.${index}.maximo`, calculado.maximo);
    setValue(`puntos.${index}.minimoReal`, calculado.minimoReal);
    setValue(`puntos.${index}.maximoReal`, calculado.maximoReal);
  };

  const onSubmit = (data) => {
    // Sin backend de Performance todavía: se simula el guardado.
    console.log(data);
    navigate("/performance");
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/performance")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{isEdit ? "Editar Performance" : "Nuevo Performance"}</Typography>
          <Typography variant="body2" color="text.secondary">Plantilla de puntos de prueba y tolerancias para calibración</Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Información General" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <AppInput label="Nombre Performance" error={errors.nombre} {...register("nombre", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <AppInput label="Comentarios" {...register("comentarios")} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} sx={{ borderRadius: 2, height: 40 }}>
                Importar imagen (PNG)
                <input type="file" accept="image/png" hidden {...register("imagen")} />
              </Button>
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Puntos de Prueba" sx={{ mb: 3 }}>
          {fields.map((field, index) => (
            <Box key={field.id}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <Grid container spacing={1.5} alignItems="flex-end">
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <AppInput label="Prueba" size="small" {...register(`puntos.${index}.prueba`, { required: true })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.2 }}>
                  <AppInput label="Nominal" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.nominal`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1 }}>
                  <AppInput label="Unidad" size="small" {...register(`puntos.${index}.unidad`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.2 }}>
                  <AppInput label="Esc. Total" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.escala`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1 }}>
                  <AppInput label="% Rdg" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.rdg`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1 }}>
                  <AppInput label="% FS" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.fs`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.1 }}>
                  <AppInput label="Unidades" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.unidades`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.2 }}>
                  <AppInput label="Incert." size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.incertidumbre`)} />
                </Grid>
                <Grid size={{ xs: 5, sm: 2.5, md: 0.9 }}>
                  <Tooltip title="Quitar punto">
                    <span>
                      <IconButton size="small" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Mínimo" size="small" InputProps={{ readOnly: true }} {...register(`puntos.${index}.minimo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Mín. real" size="small" InputProps={{ readOnly: true }} {...register(`puntos.${index}.minimoReal`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Máximo" size="small" InputProps={{ readOnly: true }} {...register(`puntos.${index}.maximo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Máx. real" size="small" InputProps={{ readOnly: true }} {...register(`puntos.${index}.maximoReal`)} />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={() => append(PUNTO_VACIO)}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            Agregar punto de prueba
          </Button>
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton variant="outlined" onClick={() => navigate("/performance")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Performance"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

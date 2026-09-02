import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel, Alert,
  IconButton, Divider, Checkbox, FormControlLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import {
  obtenerModelo, crearModelo, actualizarModelo,
} from "../../services/incertidumbre";

const TIPOS = ["A", "B"];
const MODOS = ["semiamplitud", "desviacion_std", "incertidumbre_std", "certificado"];
const DISTRIBUCIONES = ["normal", "rectangular", "triangular", "forma_u"];
const REGLAS = ["simple", "guard_band_U", "guard_band_2U"];

const contribucionVacia = () => ({
  fuente: "", simbolo: "", tipo: "B", modo: "semiamplitud", distribucion: "rectangular",
  valorSugerido: 0, k: 2, n: "", divisorManual: "", coefSensibilidad: 1, gradosLibertad: "",
  unidad: "", ayuda: "", obligatoria: false,
});

// Administración de ModeloIncertidumbre: plantilla de presupuesto GUM/EA-4/02
// reutilizable por magnitud + tipo de instrumento (ej. longitud->micrómetro).
export default function PlantillaIncertidumbreForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      magnitud: "", tipoInstrumento: "", nombre: "", mensurando: "", unidad: "",
      normaReferencia: "JCGM 100:2008 (GUM); EA-4/02", nivelConfianza: "95.45%",
      rangoTipico: "", notas: "", activo: true,
      criterioEmp: "", criterioRegla: "simple",
      contribuciones: [contribucionVacia()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "contribuciones" });

  useEffect(() => {
    if (!isEdit) return;
    obtenerModelo(id)
      .then((m) => {
        reset({
          magnitud: m.magnitud, tipoInstrumento: m.tipoInstrumento, nombre: m.nombre,
          mensurando: m.mensurando ?? "", unidad: m.unidad ?? "",
          normaReferencia: m.normaReferencia ?? "JCGM 100:2008 (GUM); EA-4/02",
          nivelConfianza: m.nivelConfianza ?? "95.45%",
          rangoTipico: m.rangoTipico ?? "", notas: m.notas ?? "", activo: m.activo ?? true,
          criterioEmp: m.criterioAceptacion?.emp ?? "", criterioRegla: m.criterioAceptacion?.regla ?? "simple",
          contribuciones: (m.contribuciones?.length ? m.contribuciones : [contribucionVacia()]).map((c) => ({
            fuente: c.fuente ?? "", simbolo: c.simbolo ?? "", tipo: c.tipo ?? "B",
            modo: c.modo ?? "semiamplitud", distribucion: c.distribucion ?? "rectangular",
            valorSugerido: c.valorSugerido ?? 0, k: c.k ?? 2, n: c.n ?? "",
            divisorManual: c.divisorManual ?? "", coefSensibilidad: c.coefSensibilidad ?? 1,
            gradosLibertad: c.gradosLibertad ?? "", unidad: c.unidad ?? "", ayuda: c.ayuda ?? "",
            obligatoria: c.obligatoria ?? false,
          })),
        });
      })
      .catch(() => setError("No se pudo cargar la plantilla."))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const num = (v) => (v === "" || v === undefined || v === null ? undefined : Number(v));

  const onSubmit = async (data) => {
    setSaving(true); setError("");
    const payload = {
      magnitud: data.magnitud, tipoInstrumento: data.tipoInstrumento, nombre: data.nombre,
      mensurando: data.mensurando || undefined, unidad: data.unidad || undefined,
      normaReferencia: data.normaReferencia || undefined, nivelConfianza: data.nivelConfianza || undefined,
      rangoTipico: data.rangoTipico || undefined, notas: data.notas || undefined, activo: data.activo,
      criterioAceptacion: { emp: num(data.criterioEmp), regla: data.criterioRegla },
      contribuciones: data.contribuciones.map((c) => ({
        fuente: c.fuente, simbolo: c.simbolo || undefined, tipo: c.tipo, modo: c.modo, distribucion: c.distribucion,
        valorSugerido: num(c.valorSugerido) ?? 0, k: num(c.k), n: num(c.n),
        divisorManual: num(c.divisorManual), coefSensibilidad: num(c.coefSensibilidad) ?? 1,
        gradosLibertad: num(c.gradosLibertad), unidad: c.unidad || undefined, ayuda: c.ayuda || undefined,
        obligatoria: c.obligatoria,
      })),
    };
    try {
      if (isEdit) await actualizarModelo(id, payload);
      else await crearModelo(payload);
      navigate("/incertidumbre/plantillas");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography color="text.secondary">Cargando…</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/incertidumbre/plantillas")} sx={{ borderRadius: 2 }}>
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{isEdit ? "Edición de Plantilla" : "Nueva Plantilla de Incertidumbre"}</Typography>
          <Typography variant="body2" color="text.secondary">Presupuesto GUM/EA-4/02 reutilizable por magnitud y tipo de instrumento</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Información General" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Magnitud" placeholder="Ej. longitud" error={errors.magnitud} {...register("magnitud", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Tipo de instrumento" placeholder="Ej. micrómetro" error={errors.tipoInstrumento} {...register("tipoInstrumento", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Nombre de la plantilla" error={errors.nombre} {...register("nombre", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Mensurando" {...register("mensurando")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Unidad" placeholder="Ej. mm" {...register("unidad")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Rango típico" placeholder="Ej. 0-25 mm" {...register("rangoTipico")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Norma de referencia" {...register("normaReferencia")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Nivel de confianza" {...register("nivelConfianza")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControlLabel
                control={<Controller name="activo" control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} />}
                label="Plantilla activa"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AppInput label="Notas" multiline minRows={2} {...register("notas")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Criterio de aceptación" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="EMP (error máximo permisible)" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register("criterioEmp")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Regla de decisión</InputLabel>
                <Controller
                  name="criterioRegla"
                  control={control}
                  render={({ field }) => (
                    <Select label="Regla de decisión" {...field} sx={{ borderRadius: 2 }}>
                      {REGLAS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>
        </AppCard>

        <AppCard
          title="Contribuciones"
          sx={{ mb: 3 }}
          action={
            <AppButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => append(contribucionVacia())} sx={{ borderRadius: 2 }}>
              Agregar contribución
            </AppButton>
          }
        >
          {fields.map((f, i) => (
            <Box key={f.id} sx={{ mb: i < fields.length - 1 ? 2 : 0 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <AppInput label="Fuente" error={errors.contribuciones?.[i]?.fuente} {...register(`contribuciones.${i}.fuente`, { required: "Obligatorio" })} />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <AppInput label="Símbolo" {...register(`contribuciones.${i}.simbolo`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo</InputLabel>
                    <Select label="Tipo" defaultValue={f.tipo} {...register(`contribuciones.${i}.tipo`)} sx={{ borderRadius: 2 }}>
                      {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Modo</InputLabel>
                    <Select label="Modo" defaultValue={f.modo} {...register(`contribuciones.${i}.modo`)} sx={{ borderRadius: 2 }}>
                      {MODOS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Distribución</InputLabel>
                    <Select label="Distribución" defaultValue={f.distribucion} {...register(`contribuciones.${i}.distribucion`)} sx={{ borderRadius: 2 }}>
                      {DISTRIBUCIONES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6, md: 0.5 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <IconButton size="small" onClick={() => remove(i)} disabled={fields.length === 1}>
                    <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                  </IconButton>
                </Grid>

                <Grid size={{ xs: 6, md: 2 }}>
                  <AppInput label="Valor sugerido" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.valorSugerido`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <AppInput label="k" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.k`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <AppInput label="n" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.n`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <AppInput label="Divisor manual" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.divisorManual`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <AppInput label="Coef. sensibilidad" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.coefSensibilidad`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <AppInput label="Grados libertad" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register(`contribuciones.${i}.gradosLibertad`)} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <AppInput label="Unidad" {...register(`contribuciones.${i}.unidad`)} />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <AppInput label="Ayuda / descripción" {...register(`contribuciones.${i}.ayuda`)} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControlLabel
                    control={
                      <Controller
                        name={`contribuciones.${i}.obligatoria`}
                        control={control}
                        render={({ field }) => <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                      />
                    }
                    label="Obligatoria"
                  />
                </Grid>
              </Grid>
              {i < fields.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton variant="outlined" onClick={() => navigate("/incertidumbre/plantillas")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={saving} sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Plantilla"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

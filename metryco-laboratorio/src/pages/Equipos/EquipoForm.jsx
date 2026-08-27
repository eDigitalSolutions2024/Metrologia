import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel, Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { listarClientes } from "../../services/clientes";
import { CATEGORIAS } from "./categorias";
import { EQUIPOS_MOCK, PATRONES_MOCK } from "./mockData";

// Refleja php/nequipo.php: el equipo pertenece a un cliente (empId) y se le
// asocian uno o más patrones de referencia usados para su calibración.
export default function EquipoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const equipoActual = isEdit ? EQUIPOS_MOCK.find((e) => String(e.id) === id) : null;

  const [clientes, setClientes] = useState([]);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: equipoActual
      ? {
          idInterno: equipoActual.idInterno, clienteId: equipoActual.clienteId,
          marca: equipoActual.marca, modelo: equipoActual.modelo, serie: equipoActual.serie,
          descripcion: equipoActual.descripcion, categoria: equipoActual.categoria,
          costo: equipoActual.costo, moneda: equipoActual.moneda, comentarios: equipoActual.comentarios,
          localizacion: equipoActual.localizacion, unidades: equipoActual.unidades,
          divMinima: equipoActual.divMinima, rango: equipoActual.rango,
          rangoUso: equipoActual.rangoUso, rangoCalibracion: equipoActual.rangoCalibracion,
          patrones: equipoActual.patrones ?? [],
        }
      : { patrones: [] },
  });

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  const onSubmit = (data) => {
    // Sin backend de Equipos todavía (ver memoria del proyecto): se simula el guardado.
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
          <Typography variant="h5" fontWeight={700}>{isEdit ? "Edición de Equipo" : "Nuevo Equipo"}</Typography>
          <Typography variant="body2" color="text.secondary">Equipo del cliente sujeto a calibración</Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Identificación" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="ID Interno" error={errors.idInterno} {...register("idInterno", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth size="small" error={!!errors.clienteId}>
                <InputLabel>Cliente</InputLabel>
                <Select label="Cliente" defaultValue={equipoActual?.clienteId ?? ""} {...register("clienteId", { required: true })} sx={{ borderRadius: 2 }}>
                  {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" defaultValue={equipoActual?.categoria ?? ""} {...register("categoria")} sx={{ borderRadius: 2 }}>
                  {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Datos Técnicos" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
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
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Unidades" error={errors.unidades} {...register("unidades", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="División mínima" error={errors.divMinima} {...register("divMinima", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Rango" {...register("rango")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput label="Localización" {...register("localizacion")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Rango de Uso" {...register("rangoUso")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Rango de Calibración" {...register("rangoCalibracion")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Costo y comentarios" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Costo" type="number" {...register("costo")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Moneda" placeholder="MXN" {...register("moneda")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Comentarios" {...register("comentarios")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Patrones a utilizar" sx={{ mb: 3 }}>
          <Controller
            name="patrones"
            control={control}
            defaultValue={equipoActual?.patrones ?? []}
            render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel>Patrones de referencia</InputLabel>
                <Select
                  multiple
                  label="Patrones de referencia"
                  value={field.value}
                  onChange={field.onChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {selected.map((val) => {
                        const p = PATRONES_MOCK.find((pat) => pat.id === val);
                        return <Chip key={val} label={p ? `${p.idInterno} — ${p.descripcion}` : val} size="small" />;
                      })}
                    </Box>
                  )}
                  sx={{ borderRadius: 2 }}
                >
                  {PATRONES_MOCK.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.idInterno} — {p.categoria} — {p.descripcion}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton variant="outlined" onClick={() => navigate("/equipos")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Equipo"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

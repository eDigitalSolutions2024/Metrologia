import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel, Chip, Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { listarClientes } from "../../services/clientes";
import { listarPatrones } from "../../services/patrones";
import { obtenerEquipo, crearEquipo, actualizarEquipo } from "../../services/equipos";
import { CATEGORIAS } from "./categorias";
import { useAuth } from "../../core/auth/useAuth";

// Refleja php/nequipo.php: el equipo pertenece a un cliente (empId) y se le
// asocian uno o más patrones de referencia usados para su calibración.
export default function EquipoForm() {
  const { user } = useAuth();
  const verCosto = user?.rol !== "tecnico";
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [clientes, setClientes] = useState([]);
  const [patrones, setPatrones] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { patrones: [] },
  });

  useEffect(() => {
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => setClientes([]));
    listarPatrones({ pageSize: 500 }).then(({ items }) => setPatrones(items)).catch(() => setPatrones([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    obtenerEquipo(id)
      .then((e) => {
        reset({
          idInterno: e.idInterno, clienteId: e.cliente?._id, marca: e.marca, modelo: e.modelo,
          serie: e.serie, descripcion: e.descripcion, categoria: e.categoria,
          costo: e.costo, moneda: e.moneda, comentarios: e.comentarios,
          localizacion: e.localizacion, unidades: e.unidades, divMinima: e.divisionMinima,
          rango: e.rango, rangoUso: e.rangoUso, rangoCalibracion: e.rangoCalibracion,
          patrones: (e.patronesSugeridos || []).map((p) => p._id ?? p),
        });
      })
      .catch(() => setError("No se pudo cargar el equipo."))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setSaving(true); setError("");
    const payload = {
      idInterno: data.idInterno, cliente: data.clienteId, marca: data.marca, modelo: data.modelo,
      serie: data.serie, descripcion: data.descripcion, categoria: data.categoria || undefined,
      comentarios: data.comentarios,
      localizacion: data.localizacion, unidades: data.unidades, divisionMinima: data.divMinima,
      // Si no se especifica un rango de uso/calibración distinto, se asume
      // el mismo Rango general del equipo (es lo más común) en vez de
      // dejarlos vacíos — se pueden editar después si de verdad difieren.
      rango: data.rango,
      rangoUso: data.rangoUso || data.rango,
      rangoCalibracion: data.rangoCalibracion || data.rango,
      patronesSugeridos: data.patrones,
    };
    // El técnico no ve Costo/Moneda — no se manda el campo, así no se corre
    // el riesgo de borrar un valor existente al guardar desde su formulario.
    if (verCosto) {
      payload.costo = data.costo ? Number(data.costo) : undefined;
      payload.moneda = data.moneda || undefined;
    }
    try {
      if (isEdit) await actualizarEquipo(id, payload);
      else await crearEquipo(payload);
      navigate("/equipos");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar el equipo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography color="text.secondary">Cargando…</Typography>;

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

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Identificación" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput
                label="ID Interno"
                placeholder={isEdit ? undefined : "Auto (si lo dejas vacío)"}
                helperText={isEdit ? undefined : "Déjalo en blanco para generarlo automáticamente"}
                error={errors.idInterno}
                {...register("idInterno")}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Controller
                name="clienteId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.clienteId}>
                    <InputLabel>Cliente</InputLabel>
                    <Select label="Cliente" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoría</InputLabel>
                    <Select label="Categoría" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              />
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
              <AppInput label="Rango de Uso" helperText="Si se deja vacío, se usa el mismo Rango" {...register("rangoUso")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AppInput label="Rango de Calibración" helperText="Si se deja vacío, se usa el mismo Rango" {...register("rangoCalibracion")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title={verCosto ? "Costo y comentarios" : "Comentarios"} sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {verCosto && (
              <>
                <Grid size={{ xs: 12, md: 4 }}>
                  <AppInput label="Costo" type="number" {...register("costo")} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <AppInput label="Moneda" placeholder="MXN" {...register("moneda")} />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12, md: verCosto ? 4 : 12 }}>
              <AppInput label="Comentarios" {...register("comentarios")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard title="Patrones a utilizar" sx={{ mb: 3 }}>
          <Controller
            name="patrones"
            control={control}
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
                        const p = patrones.find((pat) => pat._id === val);
                        return <Chip key={val} label={p ? `${p.codigo} — ${p.descripcion}` : val} size="small" />;
                      })}
                    </Box>
                  )}
                  sx={{ borderRadius: 2 }}
                >
                  {patrones.map((p) => (
                    <MenuItem key={p._id} value={p._id}>{p.codigo} — {p.categoria} — {p.descripcion}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton type="button" variant="outlined" onClick={() => navigate("/equipos")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={saving} sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Equipo"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

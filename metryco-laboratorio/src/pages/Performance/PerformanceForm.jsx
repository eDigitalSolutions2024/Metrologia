import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { Box, Typography, Grid, IconButton, Tooltip, Button, Divider, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { obtenerPerformance, crearPerformance, actualizarPerformance, importarPuntosPerformance } from "../../services/performance";

const PUNTO_VACIO = {
  prueba: "", nominal: "", unidad: "", escala: "", rdg: "", fs: "", unidades: "", incertidumbre: "",
  minimo: "", minimoReal: "", maximo: "", maximoReal: "",
};

// Réplica de la fórmula de php/input_form.php (calcula_/calcula_real_), igual
// a la que corre en el servidor (performance.service.js calcularPunto) —
// aquí solo se usa para la vista previa en vivo mientras se captura.
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

// Backend <-> formulario: el modelo usa escalaTotal/porcentajeRdg/porcentajeFs.
function puntoDesdeBackend(p) {
  return {
    prueba: p.prueba ?? "", nominal: p.nominal ?? "", unidad: p.unidad ?? "",
    escala: p.escalaTotal ?? "", rdg: p.porcentajeRdg ?? "", fs: p.porcentajeFs ?? "",
    unidades: p.unidades ?? "", incertidumbre: p.incertidumbre ?? "",
    minimo: p.minimo ?? "", minimoReal: p.minimoReal ?? "", maximo: p.maximo ?? "", maximoReal: p.maximoReal ?? "",
  };
}

function puntoAlBackend(p) {
  return {
    prueba: p.prueba, nominal: Number(p.nominal), unidad: p.unidad,
    escalaTotal: Number(p.escala), porcentajeRdg: Number(p.rdg), porcentajeFs: Number(p.fs),
    unidades: Number(p.unidades), incertidumbre: p.incertidumbre === "" ? undefined : Number(p.incertidumbre),
  };
}

export default function PerformanceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importando, setImportando] = useState(false);
  const [importInfo, setImportInfo] = useState("");
  const fileInputRef = useRef(null);

  const { register, control, handleSubmit, getValues, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { nombre: "", comentarios: "", puntos: [PUNTO_VACIO] },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "puntos" });

  const onArchivoSeleccionado = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!archivo) return;
    setImportando(true); setError(""); setImportInfo("");
    try {
      const puntosImportados = await importarPuntosPerformance(archivo);
      replace(puntosImportados.map(puntoDesdeBackend));
      setImportInfo(`${puntosImportados.length} punto(s) importado(s) de "${archivo.name}". Revísalos antes de guardar.`);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo importar el archivo.");
    } finally {
      setImportando(false);
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    obtenerPerformance(id)
      .then((p) => {
        reset({
          nombre: p.nombre, comentarios: p.comentarios,
          puntos: (p.puntos ?? []).map(puntoDesdeBackend),
        });
      })
      .catch(() => setError("No se pudo cargar el performance."))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const recalcularFila = (index) => {
    const actual = getValues(`puntos.${index}`);
    const calculado = calcularTolerancias(actual);
    setValue(`puntos.${index}.minimo`, calculado.minimo);
    setValue(`puntos.${index}.maximo`, calculado.maximo);
    setValue(`puntos.${index}.minimoReal`, calculado.minimoReal);
    setValue(`puntos.${index}.maximoReal`, calculado.maximoReal);
  };

  const onSubmit = async (data) => {
    setSaving(true); setError("");
    const payload = {
      nombre: data.nombre, comentarios: data.comentarios,
      puntos: data.puntos.map(puntoAlBackend),
    };
    try {
      if (isEdit) await actualizarPerformance(id, payload);
      else await crearPerformance(payload);
      navigate("/performance");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar el performance.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography color="text.secondary">Cargando…</Typography>;

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

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Información General" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <AppInput label="Nombre Performance" error={errors.nombre} {...register("nombre", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <AppInput label="Comentarios" {...register("comentarios")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard
          title="Puntos de Prueba"
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                hidden
                onChange={onArchivoSeleccionado}
              />
              <Button
                type="button"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importando}
                sx={{ borderRadius: 2 }}
              >
                {importando ? "Importando…" : "Importar Excel/CSV"}
              </Button>
            </>
          }
          sx={{ mb: 3 }}
        >
          {importInfo && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setImportInfo("")}>
              {importInfo}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Columnas esperadas: Prueba, Nominal, Unidad, Escala Total, %RDG, %FS, Unidades, Incertidumbre.
          </Typography>
          {fields.map((field, index) => (
            <Box key={field.id}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <Grid container spacing={1.5} sx={{ alignItems: "flex-end" }}>
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
                      <IconButton type="button" size="small" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Mínimo" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.minimo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Mín. real" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.minimoReal`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Máximo" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.maximo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Máx. real" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.maximoReal`)} />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button
            type="button"
            startIcon={<AddIcon />}
            onClick={() => append(PUNTO_VACIO)}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            Agregar punto de prueba
          </Button>
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton type="button" variant="outlined" onClick={() => navigate("/performance")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={saving} sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Performance"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Box, Typography, Grid, IconButton, Tooltip, Button, Alert, Autocomplete, TextField, Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { obtenerPerformance, crearPerformance, actualizarPerformance, importarPuntosPerformance } from "../../services/performance";
import { UNIDADES_POR_CATEGORIA } from "../Equipos/categorias";

// Sin selector de categoría en este formulario (a diferencia de Equipos/
// Patrones), así que se ofrece el catálogo completo de unidades como
// sugerencia — el campo sigue siendo texto libre.
const TODAS_LAS_UNIDADES = [...new Set(Object.values(UNIDADES_POR_CATEGORIA).flat())].sort();

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
  const theme = useTheme();
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
      const { puntos: puntosImportados, modo, advertencias } = await importarPuntosPerformance(archivo);
      replace(puntosImportados.map(puntoDesdeBackend));
      const origen = modo === "ia" ? "interpretado por IA (el archivo no traía los encabezados esperados)" : `de "${archivo.name}"`;
      const avisos = advertencias?.length ? ` · ${advertencias.join(" ")}` : "";
      setImportInfo(`${puntosImportados.length} punto(s) importado(s), ${origen}. Revísalos antes de guardar.${avisos}`);
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

        <AppCard title="Puntos de Prueba" sx={{ mb: 3 }}>
          {/* Importar destaca arriba de todo: es la forma más rápida de capturar */}
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
              p: 2, mb: 3, borderRadius: 3,
              border: "1.5px dashed", borderColor: "secondary.main",
              bgcolor: theme.palette.secondary.main + "0C",
            }}
          >
            <Box sx={{
              width: 46, height: 46, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0,
              bgcolor: theme.palette.secondary.main + "1F", color: "secondary.main",
            }}>
              <AutoAwesomeOutlinedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="body2" fontWeight={700}>¿Ya tienes los puntos en un archivo?</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Sube tu Excel o CSV y se capturan solos. Si las columnas no vienen exactas, una IA las interpreta por ti.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", opacity: 0.75, mt: 0.25 }}>
                Columnas ideales: Prueba, Nominal, Unidad, Escala Total, %RDG, %FS, Unidades, Incertidumbre.
              </Typography>
            </Box>
            <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" hidden onChange={onArchivoSeleccionado} />
            <AppButton
              type="button"
              variant="contained"
              startIcon={<UploadFileIcon />}
              loading={importando}
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 2, flexShrink: 0 }}
            >
              Importar Excel/CSV
            </AppButton>
          </Box>

          {importInfo && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setImportInfo("")}>
              {importInfo}
            </Alert>
          )}

          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "divider",
                position: "relative",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Chip label={`Punto ${index + 1}`} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />
                <Tooltip title="Quitar punto">
                  <span>
                    <IconButton type="button" size="small" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <AppInput label="Prueba" size="small" {...register(`puntos.${index}.prueba`, { required: true })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Nominal" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.nominal`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.3 }}>
                  <Controller
                    name={`puntos.${index}.unidad`}
                    control={control}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={TODAS_LAS_UNIDADES}
                        value={value ?? ""}
                        onChange={(_, val) => onChange(val ?? "")}
                        onInputChange={(_, val) => onChange(val)}
                        onBlur={onBlur}
                        renderInput={(params) => <TextField {...params} inputRef={ref} label="Unidad" size="small" />}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Esc. Total" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.escala`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.3 }}>
                  <AppInput label="% Rdg" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.rdg`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.3 }}>
                  <AppInput label="% FS" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.fs`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <AppInput label="Unidades" size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.unidades`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.6 }}>
                  <AppInput label="Incert." size="small" onBlur={() => recalcularFila(index)} {...register(`puntos.${index}.incertidumbre`)} />
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 2, mb: 1 }}>
                <CalculateOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Tolerancias calculadas</Typography>
              </Box>
              <Grid container spacing={1.5} sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.5, mx: 0 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <AppInput label="Mínimo" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.minimo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <AppInput label="Mín. real" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.minimoReal`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <AppInput label="Máximo" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.maximo`)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <AppInput label="Máx. real" size="small" slotProps={{ input: { readOnly: true } }} {...register(`puntos.${index}.maximoReal`)} />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button
            type="button"
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => append(PUNTO_VACIO)}
            sx={{
              borderRadius: 3, py: 1.25, border: "1.5px dashed", borderColor: "divider",
              color: "text.secondary", "&:hover": { borderColor: "secondary.main", bgcolor: "transparent" },
            }}
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

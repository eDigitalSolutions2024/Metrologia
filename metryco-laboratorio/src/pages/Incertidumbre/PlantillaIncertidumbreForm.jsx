import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, Select, FormControl, InputLabel, Alert,
  IconButton, Divider, Checkbox, FormControlLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import {
  obtenerModelo, crearModelo, actualizarModelo, listarMagnitudes,
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
  const location = useLocation();
  const isEdit = !!id;
  const importado = location.state?.importado; // viene de "Importar Word/Excel" en el listado
  const nombreArchivoImportado = location.state?.nombreArchivo;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [magnitudes, setMagnitudes] = useState([]);
  const [unidadTocada, setUnidadTocada] = useState(false);
  const [avisoImportacion, setAvisoImportacion] = useState(null); // { advertencias, textoExtraido, aplicada }

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      magnitud: "", tipoInstrumento: "", nombre: "", mensurando: "", unidad: "",
      normaReferencia: "JCGM 100:2008 (GUM); EA-4/02", nivelConfianza: "95.45%",
      rangoTipico: "", notas: "", activo: true,
      criterioEmp: "", criterioRegla: "simple",
      contribuciones: [contribucionVacia()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "contribuciones" });

  const magnitudSel = watch("magnitud");
  const tipoSel = watch("tipoInstrumento");
  const { onChange: onChangeUnidadRHF, ...unidadReg } = register("unidad");
  const tiposDeLaMagnitud = magnitudes.find((m) => m.clave === magnitudSel)?.tipos || [];

  useEffect(() => {
    listarMagnitudes().then(setMagnitudes).catch(() => setMagnitudes([]));
  }, []);

  // Precarga con lo que trajo "Importar Word/Excel" (ver PlantillasIncertidumbrePage).
  // Se espera a que el catálogo de magnitudes esté cargado para poder mapear
  // el texto libre que devolvió la IA a las claves reales del sistema.
  useEffect(() => {
    if (isEdit || !importado || avisoImportacion || magnitudes.length === 0) return;

    const { modo, plantilla, advertencias = [] } = importado;
    const avisos = [...advertencias];

    if (modo !== "ia" || !plantilla) {
      setAvisoImportacion({ aplicada: false, avisos, textoExtraido: importado.textoExtraido });
      return;
    }

    const normaliza = (s) => String(s ?? "").trim().toLowerCase();
    const magnitudEncontrada = magnitudes.find(
      (m) => normaliza(m.clave) === normaliza(plantilla.magnitud) || normaliza(m.nombre) === normaliza(plantilla.magnitud)
    );
    if (plantilla.magnitud && !magnitudEncontrada) {
      avisos.push(`La IA sugirió la magnitud "${plantilla.magnitud}", que no existe en el catálogo — elígela manualmente.`);
    }
    const tipos = magnitudEncontrada?.tipos || [];
    const tipoEncontrado = tipos.find(
      (t) => normaliza(t.clave) === normaliza(plantilla.tipoInstrumento) || normaliza(t.nombre) === normaliza(plantilla.tipoInstrumento)
    );
    if (plantilla.tipoInstrumento && magnitudEncontrada && !tipoEncontrado) {
      avisos.push(`La IA sugirió el instrumento "${plantilla.tipoInstrumento}", que no existe en esa magnitud — elígelo manualmente.`);
    }

    const reglaValida = REGLAS.includes(plantilla.criterioAceptacion?.regla) ? plantilla.criterioAceptacion.regla : "simple";

    reset({
      magnitud: magnitudEncontrada?.clave || "",
      tipoInstrumento: tipoEncontrado?.clave || "",
      nombre: plantilla.nombre || "",
      mensurando: plantilla.mensurando || "",
      unidad: plantilla.unidad || "",
      normaReferencia: plantilla.normaReferencia || "JCGM 100:2008 (GUM); EA-4/02",
      nivelConfianza: plantilla.nivelConfianza || "95.45%",
      rangoTipico: plantilla.rangoTipico || "",
      notas: plantilla.notas || "",
      activo: true,
      criterioEmp: plantilla.criterioAceptacion?.emp ?? "",
      criterioRegla: reglaValida,
      contribuciones: plantilla.contribuciones?.length
        ? plantilla.contribuciones.map((c) => ({
            fuente: c.fuente || "", simbolo: c.simbolo || "",
            tipo: TIPOS.includes(c.tipo) ? c.tipo : "B",
            modo: MODOS.includes(c.modo) ? c.modo : "semiamplitud",
            distribucion: DISTRIBUCIONES.includes(c.distribucion) ? c.distribucion : "rectangular",
            valorSugerido: c.valorSugerido ?? 0, k: c.k ?? 2, n: c.n ?? "",
            divisorManual: c.divisorManual ?? "", coefSensibilidad: c.coefSensibilidad ?? 1,
            gradosLibertad: c.gradosLibertad ?? "", unidad: c.unidad || "", ayuda: c.ayuda || "",
            obligatoria: false,
          }))
        : [contribucionVacia()],
    });
    if (plantilla.unidad) setUnidadTocada(true);
    setAvisoImportacion({ aplicada: true, avisos });
  }, [importado, magnitudes, isEdit, avisoImportacion, reset]);

  // La unidad se propone sola a partir del catálogo (unidadSugerida del tipo
  // de instrumento elegido) — se puede seguir editando a mano si hace falta.
  useEffect(() => {
    if (unidadTocada) return;
    const sugerida = tiposDeLaMagnitud.find((t) => t.clave === tipoSel)?.unidadSugerida;
    if (sugerida) setValue("unidad", sugerida);
  }, [tipoSel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si cambian la magnitud a mano, el tipo elegido antes puede ya no
  // pertenecer a ella — se limpia solo en ese caso (no al cargar en edición).
  useEffect(() => {
    if (magnitudes.length === 0) return;
    if (tipoSel && !tiposDeLaMagnitud.some((t) => t.clave === tipoSel)) setValue("tipoInstrumento", "");
  }, [magnitudSel]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {avisoImportacion && (
        <Alert
          severity={avisoImportacion.aplicada ? "info" : "warning"}
          icon={<AutoAwesomeOutlinedIcon fontSize="inherit" />}
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setAvisoImportacion(null)}
        >
          {avisoImportacion.aplicada ? (
            <>
              <Typography variant="body2" fontWeight={700}>
                Plantilla generada por IA {nombreArchivoImportado && `a partir de "${nombreArchivoImportado}"`} — revisa cada campo antes de guardar.
              </Typography>
            </>
          ) : (
            <Typography variant="body2" fontWeight={700}>
              No se pudo interpretar el archivo automáticamente{nombreArchivoImportado && ` ("${nombreArchivoImportado}")`}. Captúrala a mano con el texto de abajo como referencia.
            </Typography>
          )}
          {avisoImportacion.avisos?.map((a, i) => (
            <Typography key={i} variant="caption" sx={{ display: "block", mt: 0.25 }}>· {a}</Typography>
          ))}
          {avisoImportacion.textoExtraido && (
            <Box
              sx={{
                mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "background.paper", border: "1px solid",
                borderColor: "divider", maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap",
                fontSize: 12.5, fontFamily: "monospace",
              }}
            >
              {avisoImportacion.textoExtraido}
            </Box>
          )}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <AppCard title="Información General" sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small" error={!!errors.magnitud}>
                <InputLabel>Magnitud</InputLabel>
                <Controller
                  name="magnitud" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <Select label="Magnitud" {...field} sx={{ borderRadius: 2 }}>
                      {magnitudes.map((m) => <MenuItem key={m.clave} value={m.clave}>{m.nombre}</MenuItem>)}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small" error={!!errors.tipoInstrumento} disabled={!magnitudSel}>
                <InputLabel>Tipo de instrumento</InputLabel>
                <Controller
                  name="tipoInstrumento" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <Select label="Tipo de instrumento" {...field} sx={{ borderRadius: 2 }}>
                      {tiposDeLaMagnitud.map((t) => <MenuItem key={t.clave} value={t.clave}>{t.nombre}</MenuItem>)}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Nombre de la plantilla" error={errors.nombre} {...register("nombre", { required: "Obligatorio" })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput label="Mensurando" {...register("mensurando")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppInput
                label="Unidad" placeholder="Ej. mm" helperText="Se sugiere del tipo de instrumento — puedes cambiarla"
                {...unidadReg}
                onChange={(e) => { setUnidadTocada(true); onChangeUnidadRHF(e); }}
              />
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
            <AppButton type="button" size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => append(contribucionVacia())} sx={{ borderRadius: 2 }}>
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
                    <Controller
                      name={`contribuciones.${i}.tipo`}
                      control={control}
                      render={({ field }) => (
                        <Select label="Tipo" {...field} value={field.value ?? f.tipo} sx={{ borderRadius: 2 }}>
                          {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Modo</InputLabel>
                    <Controller
                      name={`contribuciones.${i}.modo`}
                      control={control}
                      render={({ field }) => (
                        <Select label="Modo" {...field} value={field.value ?? f.modo} sx={{ borderRadius: 2 }}>
                          {MODOS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Distribución</InputLabel>
                    <Controller
                      name={`contribuciones.${i}.distribucion`}
                      control={control}
                      render={({ field }) => (
                        <Select label="Distribución" {...field} value={field.value ?? f.distribucion} sx={{ borderRadius: 2 }}>
                          {DISTRIBUCIONES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6, md: 0.5 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <IconButton type="button" size="small" onClick={() => remove(i)} disabled={fields.length === 1}>
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
          <AppButton type="button" variant="outlined" onClick={() => navigate("/incertidumbre/plantillas")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={saving} sx={{ borderRadius: 2 }}>{isEdit ? "Guardar cambios" : "Crear Plantilla"}</AppButton>
        </Box>
      </Box>
    </Box>
  );
}

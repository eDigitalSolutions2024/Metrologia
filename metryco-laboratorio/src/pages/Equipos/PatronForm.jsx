import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, MenuItem, TextField, IconButton, Button, Alert, Chip, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SquareFootOutlinedIcon from "@mui/icons-material/SquareFootOutlined";
import FunctionsOutlinedIcon from "@mui/icons-material/FunctionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import PageHeader from "../../shared/components/PageHeader";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import { CATEGORIAS, iconoCategoria, colorCategoria } from "./categorias";
import { obtenerPatron, crearPatron, actualizarPatron, adjuntarCertificadoPatron, obtenerSiguienteCodigoPatron } from "../../services/patrones";

const num = (v) => (v === "" || v == null ? undefined : Number(v));

function vencimientoPreview(fecha, meses) {
  if (!fecha || !meses) return null;
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + Number(meses));
  return d.toISOString().slice(0, 10);
}

export default function PatronForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [cargando, setCargando] = useState(isEdit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [patronId, setPatronId] = useState(id || null);
  const [archivoInfo, setArchivoInfo] = useState(null);
  const [codigoAutoGenerado, setCodigoAutoGenerado] = useState(!isEdit);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      codigo: "", nombre: "", descripcion: "", comentarios: "", categoria: "", magnitud: "",
      marca: "", modelo: "", serie: "",
      unidad: "", intervaloMedicion: "", resolucion: "",
      incertidumbre: { modo: "fija", k: 2, unidad: "", valor: "", puntos: [{ nominal: "", U: "" }] },
      deriva: { valor: "", unidad: "", periodoMeses: 12 },
      trazabilidad: "",
      calibracion: { laboratorio: "", numeroCertificado: "", fecha: "", periodicidadMeses: 12 },
      condicionesReferencia: "", manejo: "", procedimiento: "", transporte: "", almacenamiento: "",
      estado: "activo",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "incertidumbre.puntos" });
  const codigoValor = watch("codigo");
  const modo = watch("incertidumbre.modo");
  const fecha = watch("calibracion.fecha");
  const periodicidad = watch("calibracion.periodicidadMeses");
  const vencPreview = useMemo(() => vencimientoPreview(fecha, periodicidad), [fecha, periodicidad]);

  // En alta: se muestra de una vez el código que le tocaría (consecutivo
  // global), editable si se prefiere capturar uno propio.
  useEffect(() => {
    if (isEdit) return;
    setGenerandoCodigo(true);
    obtenerSiguienteCodigoPatron()
      .then((codigo) => setValue("codigo", codigo))
      .catch(() => {})
      .finally(() => setGenerandoCodigo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    obtenerPatron(id)
      .then((p) => {
        reset({
          codigo: p.codigo || "", nombre: p.nombre || "", descripcion: p.descripcion || "",
          comentarios: p.comentarios || "",
          categoria: p.categoria || "", magnitud: p.magnitud || "",
          marca: p.marca || "", modelo: p.modelo || "", serie: p.serie || "",
          unidad: p.unidad || "", intervaloMedicion: p.intervaloMedicion || "", resolucion: p.resolucion || "",
          incertidumbre: {
            modo: p.incertidumbre?.modo || "fija",
            k: p.incertidumbre?.k ?? 2,
            unidad: p.incertidumbre?.unidad || "",
            valor: p.incertidumbre?.valor ?? "",
            puntos: p.incertidumbre?.puntos?.length ? p.incertidumbre.puntos : [{ nominal: "", U: "" }],
          },
          deriva: {
            valor: p.deriva?.valor ?? "", unidad: p.deriva?.unidad || "",
            periodoMeses: p.deriva?.periodoMeses ?? 12,
          },
          trazabilidad: p.trazabilidad || "",
          calibracion: {
            laboratorio: p.calibracion?.laboratorio || "",
            numeroCertificado: p.calibracion?.numeroCertificado || "",
            fecha: p.calibracion?.fecha ? p.calibracion.fecha.slice(0, 10) : "",
            periodicidadMeses: p.calibracion?.periodicidadMeses ?? 12,
          },
          condicionesReferencia: p.condicionesReferencia || "", manejo: p.manejo || "",
          procedimiento: p.procedimiento || "", transporte: p.transporte || "", almacenamiento: p.almacenamiento || "",
          estado: p.estado || "activo",
        });
        setArchivoInfo(p.calibracion?.archivo || null);
      })
      .catch(() => setError("No se pudo cargar el patrón."))
      .finally(() => setCargando(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (v) => {
    setSaving(true); setError("");
    const payload = {
      ...v,
      incertidumbre: {
        modo: v.incertidumbre.modo,
        k: num(v.incertidumbre.k) ?? 2,
        unidad: v.incertidumbre.unidad || v.unidad,
        valor: v.incertidumbre.modo === "fija" ? num(v.incertidumbre.valor) : undefined,
        puntos: v.incertidumbre.modo === "tabla"
          ? v.incertidumbre.puntos.map((p) => ({ nominal: num(p.nominal), U: num(p.U) })).filter((p) => p.nominal != null && p.U != null)
          : [],
      },
      deriva: v.deriva.valor
        ? { valor: num(v.deriva.valor), unidad: v.deriva.unidad || v.unidad, periodoMeses: num(v.deriva.periodoMeses) }
        : undefined,
      calibracion: {
        ...v.calibracion,
        fecha: v.calibracion.fecha || undefined,
        periodicidadMeses: num(v.calibracion.periodicidadMeses),
      },
    };
    try {
      const saved = isEdit ? await actualizarPatron(id, payload) : await crearPatron(payload);
      setPatronId(saved._id);
      if (!isEdit) { navigate(`/equipos/patrones/${saved._id}/editar`, { replace: true }); }
      else navigate("/equipos/patrones");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar el patrón.");
    } finally { setSaving(false); }
  };

  const subirPdf = async (file) => {
    if (!file || !patronId) return;
    try {
      const saved = await adjuntarCertificadoPatron(patronId, file);
      setArchivoInfo(saved.calibracion?.archivo || null);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo subir el certificado.");
    }
  };

  if (cargando) return <Box sx={{ p: 4 }}><Typography color="text.secondary">Cargando…</Typography></Box>;

  return (
    <Box>
      <PageHeader
        icon={<StraightenOutlinedIcon />}
        title={isEdit ? "Edición de Patrón" : "Alta de Patrón"}
        subtitle="Patrón de referencia trazable del laboratorio"
        actions={
          <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/equipos/patrones")} sx={{ borderRadius: 2 }}>
            Regresar
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

        <AppCard title="Información general" icon={<BadgeOutlinedIcon />}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth size="small" label="Código"
                helperText={
                  isEdit ? undefined
                  : generandoCodigo ? "Generando…"
                  : codigoAutoGenerado ? "Generado automáticamente — puedes cambiarlo"
                  : "Editado manualmente"
                }
                slotProps={{ inputLabel: { shrink: !!codigoValor } }}
                {...register("codigo", { onChange: () => setCodigoAutoGenerado(false) })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label="Nombre *" error={!!errors.nombre} helperText={errors.nombre && "Obligatorio"} {...register("nombre", { required: true })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <TextField select fullWidth size="small" label="Estado" {...field} value={field.value ?? "activo"}>
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="en_calibracion">En calibración</MenuItem>
                    <MenuItem value="baja">Baja</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth size="small" label="Descripción" {...register("descripcion")} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Comentarios" multiline minRows={2} {...register("comentarios")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <TextField select fullWidth size="small" label="Categoría" {...field} value={field.value ?? ""}>
                    <MenuItem value="">—</MenuItem>
                    {CATEGORIAS.map((c) => {
                      const Icono = iconoCategoria(c);
                      return (
                        <MenuItem key={c} value={c} sx={{ display: "flex", gap: 1 }}>
                          <Icono fontSize="small" sx={{ color: colorCategoria(c) }} /> {c}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Marca" {...register("marca")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Modelo" {...register("modelo")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Serie" {...register("serie")} /></Grid>
          </Grid>
        </AppCard>

        <AppCard title="Metrología" icon={<SquareFootOutlinedIcon />}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><TextField fullWidth size="small" label="Unidad" placeholder="mm, bar, °C…" {...register("unidad")} /></Grid>
            <Grid size={{ xs: 6, md: 5 }}><TextField fullWidth size="small" label="Intervalo de medición" placeholder="0–100 mm" {...register("intervaloMedicion")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Resolución" {...register("resolucion")} /></Grid>
          </Grid>
        </AppCard>

        <AppCard title="Incertidumbre del certificado del patrón" subtitle="Es la U que informa el certificado del patrón, con su k. El motor usa u = U / k." icon={<FunctionsOutlinedIcon />}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="incertidumbre.modo"
                control={control}
                render={({ field }) => (
                  <TextField select fullWidth size="small" label="Modo" {...field} value={field.value ?? "fija"}>
                    <MenuItem value="fija">Fija (un valor)</MenuItem>
                    <MenuItem value="tabla">Tabla por punto</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="k" type="number" {...register("incertidumbre.k")} /></Grid>
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="Unidad de U" placeholder="= unidad del patrón" {...register("incertidumbre.unidad")} /></Grid>

            {modo === "fija" ? (
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="U (del certificado)" type="number" slotProps={{ htmlInput: { step: "any" } }} {...register("incertidumbre.valor")} />
              </Grid>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">Puntos {"{ nominal, U }"} — el motor interpola linealmente.</Typography>
                {fields.map((f, i) => (
                  <Box key={f.id} sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: 1 }}>
                    <TextField size="small" label="Nominal" type="number" slotProps={{ htmlInput: { step: "any" } }} sx={{ width: 150 }} {...register(`incertidumbre.puntos.${i}.nominal`)} />
                    <TextField size="small" label="U" type="number" slotProps={{ htmlInput: { step: "any" } }} sx={{ width: 180 }} {...register(`incertidumbre.puntos.${i}.U`)} />
                    <IconButton size="small" onClick={() => remove(i)} disabled={fields.length === 1}>
                      <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => append({ nominal: "", U: "" })} sx={{ mt: 1, borderRadius: 2 }}>Punto</Button>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Deriva (opcional)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="Deriva máx." type="number" slotProps={{ htmlInput: { step: "any" } }} {...register("deriva.valor")} /></Grid>
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="Unidad" {...register("deriva.unidad")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="En cuántos meses" type="number" {...register("deriva.periodoMeses")} /></Grid>
          </Grid>
        </AppCard>

        <AppCard title="Calibración y vigencia" icon={<VerifiedOutlinedIcon />}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Trazabilidad" placeholder="CENAM, NIST vía Fluke…" {...register("trazabilidad")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Laboratorio calibrante" {...register("calibracion.laboratorio")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="N° de certificado" {...register("calibracion.numeroCertificado")} /></Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth size="small" type="date" label="Fecha de calibración" slotProps={{ inputLabel: { shrink: true } }} {...register("calibracion.fecha")} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth size="small" label="Periodicidad (meses)" type="number" {...register("calibracion.periodicidadMeses")} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth size="small" label="Vencimiento (calculado)" value={vencPreview || "—"}
                slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} disabled={!patronId} sx={{ borderRadius: 2 }}>
              Subir certificado (PDF)
              <input type="file" accept="application/pdf" hidden onChange={(e) => subirPdf(e.target.files?.[0])} />
            </Button>
            {!patronId && <Typography variant="caption" color="text.secondary">Guarda el patrón primero para adjuntar el PDF.</Typography>}
            {archivoInfo && (
              <Chip icon={<DescriptionOutlinedIcon />} label={archivoInfo.nombreOriginal || "certificado.pdf"} variant="outlined" />
            )}
          </Box>
        </AppCard>

        <AppCard title="Operación" icon={<BuildOutlinedIcon />}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Condiciones de referencia" placeholder="20 ± 1 °C, 45–55 % HR" {...register("condicionesReferencia")} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" multiline minRows={2} label="Manejo" {...register("manejo")} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" multiline minRows={2} label="Procedimiento" {...register("procedimiento")} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" multiline minRows={2} label="Transporte" {...register("transporte")} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" multiline minRows={2} label="Almacenamiento" {...register("almacenamiento")} /></Grid>
          </Grid>
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton type="button" variant="outlined" onClick={() => navigate("/equipos/patrones")} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={saving} sx={{ borderRadius: 2 }}>
            {isEdit ? "Guardar cambios" : "Crear patrón"}
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
}

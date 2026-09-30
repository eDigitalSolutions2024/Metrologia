import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Grid,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  MenuItem, Select, FormControl, InputLabel, Alert, Tooltip,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import AppButton from "../../shared/components/AppButton";
import AppInput from "../../shared/components/AppInput";
import AppCard from "../../shared/components/AppCard";
import { formatCurrency } from "../../shared/utils/currency";
import { listarClientes } from "../../services/clientes";
import { listarCotizaciones, obtenerCotizacion } from "../../services/cotizaciones";
import { crearCfdi } from "../../services/cfdi";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

const FORMAS_PAGO_SAT = [
  { v: "01", l: "01 - Efectivo" },
  { v: "02", l: "02 - Cheque nominativo" },
  { v: "03", l: "03 - Transferencia electrónica" },
  { v: "04", l: "04 - Tarjeta de crédito" },
  { v: "28", l: "28 - Tarjeta de débito" },
  { v: "99", l: "99 - Por definir" },
];

// "16" y "0" son ambos "Sí objeto de impuesto" (ObjetoImp 02) con distinta
// tasa — el SAT los trata distinto de "exento" (ObjetoImp 01, sin nodo de
// impuestos), así que no basta un checkbox sí/no de IVA. La tasa de 8% de
// zona fronteriza ya no existe (se homologó a 16% desde 2021), así que no se
// incluye aquí.
const TASAS_IVA = [
  { v: "16", l: "IVA 16%" },
  { v: "0", l: "IVA Tasa 0% (exportación, etc.)" },
  { v: "exento", l: "Exento / no objeto" },
];

const CONCEPTO_VACIO = {
  claveProdServ: "", descripcion: "", cantidad: 1, claveUnidad: "", unidad: "",
  valorUnitario: 0, tasaIva: "16",
};

const DEFAULT_VALUES = {
  cliente: "", cotizacion: "", formaPago: "03", metodoPago: "PUE", comentarios: "",
  conceptos: [CONCEPTO_VACIO],
};

/**
 * Crea un CFDI en estado "borrador" (nunca timbra directamente). El timbrado
 * real se hace después, desde el detalle, y requiere un PAC configurado.
 */
export default function CrearCfdiDialog({ open, onClose, onCreado, prefill }) {
  // Cotización pendiente de cargar cuando se abre desde el botón "Generar factura" de Cotizaciones.
  const cotizacionPendienteRef = useRef(null);
  const [clientes, setClientes] = useState([]);
  const [cotizacionesAprobadas, setCotizacionesAprobadas] = useState([]);
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [avanceCot, setAvanceCot] = useState(null); // avance de facturación de la cotización cargada
  const [submitError, setSubmitError] = useState("");

  const {
    register, control, handleSubmit, watch, reset, setValue, getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULT_VALUES });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "conceptos" });
  const conceptos = watch("conceptos");
  const clienteId = watch("cliente");
  const cotizacionId = watch("cotizacion");
  const clienteElegido = clientes.find((c) => c._id === clienteId);
  const creditoCliente = clienteElegido?.diasCredito;
  const sugeridoParaRef = useRef(null);

  // Sugiere el método de pago según el crédito del cliente (con crédito: PPD y forma 99; contado: PUE).
  // Solo una vez por cliente elegido, para no pisar lo que el usuario cambie después.
  useEffect(() => {
    if (!clienteId || creditoCliente === undefined || sugeridoParaRef.current === clienteId) return;
    sugeridoParaRef.current = clienteId;
    const ppd = creditoCliente > 0;
    setValue("metodoPago", ppd ? "PPD" : "PUE");
    setValue("formaPago", ppd ? "99" : "03");
  }, [clienteId, creditoCliente, setValue]);

  useEffect(() => {
    if (!open) return;
    sugeridoParaRef.current = null;
    setAvanceCot(null);
    reset({ ...DEFAULT_VALUES, cliente: prefill?.cliente || "" });
    cotizacionPendienteRef.current = prefill?.cotizacion || null;
    setSubmitError("");
    listarClientes({ pageSize: 300 }).then(({ items }) => setClientes(items)).catch(() => setClientes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  // Cotizaciones aprobadas del cliente elegido — para poder jalar sus
  // partidas en vez de volver a capturarlas a mano. Se recarga cada vez que
  // cambia el cliente y se limpia la selección previa (una cotización de
  // otro cliente ya no aplica).
  useEffect(() => {
    const pendiente = cotizacionPendienteRef.current;
    if (!pendiente) setValue("cotizacion", "");
    if (!clienteId) { setCotizacionesAprobadas([]); return; }
    listarCotizaciones({ clienteId, status: "aprobada", pageSize: 100 })
      .then(({ items }) => setCotizacionesAprobadas(items))
      .catch(() => setCotizacionesAprobadas([]))
      .finally(() => {
        if (pendiente && cotizacionPendienteRef.current === pendiente) {
          cotizacionPendienteRef.current = null;
          cargarDesdeCotizacion(pendiente);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const cargarDesdeCotizacion = async (id) => {
    setValue("cotizacion", id);
    setAvanceCot(null);
    if (!id) return;
    setCargandoCotizacion(true);
    try {
      const cot = await obtenerCotizacion(id);
      // Solo lo que falta por facturar: una cotización se puede facturar por partes.
      const partidas = cot.facturacion?.items || cot.items.map((it, idx) => ({ idx, cantidad: it.cantidad, pendiente: it.cantidad }));
      const pendientes = partidas.filter((p) => p.pendiente > 0);
      if (pendientes.length === 0) {
        setSubmitError(`La cotización ${cot.folio} ya está facturada por completo.`);
        setValue("cotizacion", "");
        return;
      }
      setAvanceCot({
        folio: cot.folio, total: partidas.length, pendientes: pendientes.length,
        yaFacturadas: partidas.filter((p) => p.pendiente <= 0).length,
      });
      // Cotizaciones solo maneja un % de IVA general, no distingue tasa 0% —
      // si trae IVA se asume 16% (lo más común), si no, exento.
      const tasaIva = Number(cot.ivaPorcentaje) > 0 ? "16" : "exento";
      replace(
        pendientes.map((p) => {
          const it = cot.items[p.idx];
          return {
            claveProdServ: it.claveProdServ || "", // viene de la cotización; las anteriores a esa captura quedan vacías
            descripcion: it.descripcion,
            cantidad: p.pendiente,
            claveUnidad: it.claveUnidad || "",
            unidad: "",
            valorUnitario: it.precioUnitario,
            tasaIva,
            partidaCotizacion: p.idx,
          };
        })
      );
      if (!getValues("comentarios")) {
        setValue("comentarios", `Cotización ${cot.folio}${cot.ordenCompra ? ` · OC ${cot.ordenCompra}` : ""}`);
      }
    } catch {
      setSubmitError("No se pudo cargar la cotización seleccionada.");
    } finally {
      setCargandoCotizacion(false);
    }
  };

  const subtotal = conceptos.reduce((s, c) => s + (Number(c.cantidad) * Number(c.valorUnitario) || 0), 0);
  const iva = conceptos.reduce((s, c) => {
    if (c.tasaIva === "exento") return s;
    const importe = Number(c.cantidad) * Number(c.valorUnitario) || 0;
    return s + importe * (c.tasaIva === "16" ? 0.16 : 0);
  }, 0);

  const onSubmit = async (data) => {
    setSubmitError("");
    try {
      const conceptosPayload = data.conceptos.map((c) => ({
        claveProdServ: c.claveProdServ,
        descripcion: c.descripcion,
        cantidad: Number(c.cantidad),
        claveUnidad: c.claveUnidad,
        unidad: c.unidad,
        valorUnitario: Number(c.valorUnitario),
        objetoImpuesto: c.tasaIva === "exento" ? "01" : "02",
        ...(data.cotizacion && c.partidaCotizacion !== undefined ? { partidaCotizacion: c.partidaCotizacion } : {}),
        impuestos: c.tasaIva === "exento"
          ? []
          : [{ tipo: "traslado", impuesto: "002", tipoFactor: "Tasa", tasaOCuota: c.tasaIva === "16" ? 0.16 : 0, base: 0, importe: 0 }],
      }));
      const creado = await crearCfdi({
        cliente: data.cliente, cotizacion: data.cotizacion || undefined,
        formaPago: data.formaPago, metodoPago: data.metodoPago,
        comentarios: data.comentarios, conceptos: conceptosPayload,
      });
      onCreado(creado);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo crear el comprobante.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700 }}>
        Nuevo comprobante fiscal (CFDI)
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ bgcolor: "background.default" }}>
          {submitError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{submitError}</Alert>}
          <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mb: 2.5, borderRadius: 2 }}>
            Esto crea un <b>borrador</b> — todavía no se timbra ante el SAT. El timbrado se hace después, desde el
            detalle del comprobante, y requiere un proveedor PAC configurado.
          </Alert>

          <AppCard dense title="Cliente y condiciones de pago" icon={<PersonOutlineOutlinedIcon />} sx={{ mb: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <FormControl fullWidth size="small" error={!!errors.cliente}>
                  <InputLabel>Cliente</InputLabel>
                  <Controller
                    name="cliente" control={control} rules={{ required: true }}
                    render={({ field }) => (
                      <Select label="Cliente" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                        {clientes.map((c) => {
                          const incompleto = !c.rfc || !c.regimenFiscal || !c.usoCFDI || !c.domicilioFiscal?.cp;
                          return (
                            <MenuItem key={c._id} value={c._id} disabled={incompleto}>
                              {c.nombre}{incompleto && (
                                <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1 }}>
                                  — datos fiscales incompletos
                                </Typography>
                              )}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Forma de pago (SAT)</InputLabel>
                  <Controller
                    name="formaPago" control={control}
                    render={({ field }) => (
                      <Select label="Forma de pago (SAT)" {...field} disabled={watch("metodoPago") === "PPD"} sx={{ borderRadius: 2 }}>
                        {FORMAS_PAGO_SAT.map((f) => <MenuItem key={f.v} value={f.v}>{f.l}</MenuItem>)}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              {cotizacionesAprobadas.length > 0 && (
                <Grid size={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cargar conceptos desde cotización aprobada (opcional)</InputLabel>
                    <Select
                      label="Cargar conceptos desde cotización aprobada (opcional)"
                      value={cotizacionId ?? ""}
                      onChange={(e) => cargarDesdeCotizacion(e.target.value)}
                      disabled={cargandoCotizacion}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">— No usar ninguna, capturar a mano —</MenuItem>
                      {cotizacionesAprobadas.map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.folio} · {formatCurrency(c.total)}{c.ordenCompra ? ` · OC ${c.ordenCompra}` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {cotizacionId && avanceCot && (
                    <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
                      Esta factura cubre <b>{avanceCot.pendientes} de {avanceCot.total} partidas</b> de {avanceCot.folio}
                      {avanceCot.yaFacturadas > 0 ? <> (las otras {avanceCot.yaFacturadas} ya se facturaron)</> : null}.
                      Para facturar <b>solo una parte</b>, quita partidas o baja las cantidades: lo que no factures ahora
                      queda pendiente en la cotización.
                    </Alert>
                  )}
                  {cotizacionId && (
                    <Alert
                      severity={conceptos.some((c) => !c.claveProdServ || !c.claveUnidad) ? "warning" : "success"}
                      icon={<ReceiptLongOutlinedIcon fontSize="small" />} sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {conceptos.some((c) => !c.claveProdServ || !c.claveUnidad)
                        ? <>Se cargaron las partidas de la cotización, pero a alguna le faltan las <b>claves SAT</b> (prod/serv y unidad) — complétalas abajo antes de guardar.</>
                        : <>Se cargaron las partidas de la cotización con sus claves SAT. Revisa y guarda el borrador.</>}
                    </Alert>
                  )}
                </Grid>
              )}
              <Grid size={{ xs: 6, md: 4 }}>
                {creditoCliente !== undefined && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Crédito del cliente: {creditoCliente > 0 ? `${creditoCliente} días` : "contado"}
                  </Typography>
                )}
                <FormControl fullWidth size="small">
                  <InputLabel>Método de pago</InputLabel>
                  <Controller
                    name="metodoPago" control={control}
                    render={({ field }) => (
                      <Select
                        label="Método de pago" {...field} sx={{ borderRadius: 2 }}
                        onChange={(e) => {
                          field.onChange(e);
                          // Regla SAT: PPD exige forma de pago "99 - Por definir".
                          setValue("formaPago", e.target.value === "PPD" ? "99" : "03");
                        }}
                      >
                        <MenuItem value="PUE">PUE - Pago en una sola exhibición</MenuItem>
                        <MenuItem value="PPD">PPD - Pago en parcialidades o diferido</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </AppCard>

          <AppCard
            dense title="Conceptos" icon={<ListAltOutlinedIcon />}
            action={
              <AppButton type="button" variant="outlined" size="small" startIcon={<AddCircleOutlineIcon />}
                onClick={() => append({ ...CONCEPTO_VACIO })} sx={{ borderRadius: 2 }}>
                Agregar concepto
              </AppButton>
            }
          >
            <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "auto", mb: 2 }}>
              <Table size="small" sx={{ minWidth: 900, "& .MuiTableCell-root": { py: 1.5, px: 1.5, verticalAlign: "top" } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "background.paper" }}>
                    <TableCell sx={{ fontWeight: 700 }} width={140}>
                      <Tooltip title="Catálogo SAT c_ClaveProdServ — consúltalo en el catálogo oficial del SAT">
                        <span>Clave SAT prod/serv</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={260}>Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={110}>
                      <Tooltip title="Catálogo SAT c_ClaveUnidad">
                        <span>Clave unidad</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={90}>Cantidad</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={130}>Valor unitario</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={150}>IVA</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} width={120}>Importe</TableCell>
                    <TableCell width={44} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, idx) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <AppInput {...register(`conceptos.${idx}.claveProdServ`, { required: true })} placeholder="80101504" />
                      </TableCell>
                      <TableCell>
                        <AppInput {...register(`conceptos.${idx}.descripcion`, { required: true })} placeholder="Calibración de manómetro..." />
                      </TableCell>
                      <TableCell>
                        <AppInput {...register(`conceptos.${idx}.claveUnidad`, { required: true })} placeholder="E48" />
                      </TableCell>
                      <TableCell>
                        <AppInput type="number" {...register(`conceptos.${idx}.cantidad`, { required: true, min: 0.01 })} inputProps={{ min: 0.01, step: "any" }} />
                      </TableCell>
                      <TableCell>
                        <AppInput type="number" {...register(`conceptos.${idx}.valorUnitario`, { required: true, min: 0 })} inputProps={{ min: 0, step: "0.01" }} />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`conceptos.${idx}.tasaIva`} control={control}
                          render={({ field: f }) => (
                            <Select {...f} size="small" fullWidth sx={{ borderRadius: 2 }}>
                              {TASAS_IVA.map((t) => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700} fontSize={13} sx={{ pt: 1 }}>
                          {formatCurrency(
                            (Number(conceptos[idx]?.cantidad) * Number(conceptos[idx]?.valorUnitario) || 0)
                            * (1 + (conceptos[idx]?.tasaIva === "16" ? 0.16 : 0))
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton type="button" size="small" onClick={() => remove(idx)} disabled={fields.length === 1} sx={{ mt: 0.5 }}>
                          <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Box sx={{ textAlign: "right", minWidth: 200 }}>
                <Typography color="text.secondary" variant="body2">Subtotal: {formatCurrency(subtotal)}</Typography>
                <Typography color="text.secondary" variant="body2">IVA: {formatCurrency(iva)}</Typography>
                <Typography variant="h6" fontWeight={800} color="secondary.main">{formatCurrency(subtotal + iva)}</Typography>
              </Box>
            </Box>
          </AppCard>

          <AppCard dense title="Comentarios" icon={<ChatBubbleOutlineOutlinedIcon />} sx={{ mt: 2.5 }}>
            {/* El texto se puede rellenar por código al cargar una cotización (no
                escrito por el usuario), y sin esto la etiqueta no sube sola y
                queda encimada con el texto — se fuerza siempre que ya tenga valor. */}
            <AppInput
              label="Comentarios (opcional)" multiline minRows={2} {...register("comentarios")}
              slotProps={{ inputLabel: { shrink: !!watch("comentarios") } }}
            />
          </AppCard>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={isSubmitting} sx={{ borderRadius: 2 }}>Guardar borrador</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

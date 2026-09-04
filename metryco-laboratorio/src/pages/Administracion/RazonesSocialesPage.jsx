import { useEffect, useState } from "react";
import {
  Box, Typography, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Switch, FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import {
  listarRazonesSociales, crearRazonSocial, actualizarRazonSocial, eliminarRazonSocial,
} from "../../services/razonesSociales";

const VACIO = { nombre: "", rfc: "", domicilio: "", telefono: "", acreditacion: "", activo: true };

// Catálogo de entidades legales con las que el laboratorio puede cotizar
// (legacy: selector "Razón Social Interna" al generar una cotización).
export default function RazonesSocialesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // null = cerrado, {} = nuevo, {...} = editar
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = () => {
    setLoading(true);
    listarRazonesSociales()
      .then(setItems)
      .catch(() => setError("No se pudieron cargar las razones sociales."))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  const columns = [
    { field: "nombre", headerName: "Nombre" },
    { field: "rfc", headerName: "RFC", renderCell: (r) => r.rfc || "—" },
    { field: "domicilio", headerName: "Domicilio", renderCell: (r) => r.domicilio || "—" },
    { field: "activo", headerName: "Estado", renderCell: (r) => <Chip size="small" label={r.activo ? "Activa" : "Inactiva"} color={r.activo ? "success" : "default"} /> },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => setEditando(r)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={() => setAEliminar(r)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<BusinessOutlinedIcon />}
        title="Razones Sociales"
        subtitle="Entidades legales con las que se puede cotizar/facturar"
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => setEditando(VACIO)} sx={{ borderRadius: 2 }}>
            Nueva Razón Social
          </AppButton>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <AppTable columns={columns} rows={items} totalCount={items.length} loading={loading} />

      <FormDialog
        datos={editando}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); cargar(); }}
      />

      <Dialog open={!!aEliminar} onClose={() => setAEliminar(null)}>
        <DialogTitle>Eliminar razón social</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Desactivar "{aEliminar?.nombre}"? Deja de aparecer como opción al cotizar; las cotizaciones ya emitidas con ella no se ven afectadas.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={() => setAEliminar(null)} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton
            color="error"
            onClick={async () => { await eliminarRazonSocial(aEliminar._id); setAEliminar(null); cargar(); }}
            sx={{ borderRadius: 2 }}
          >
            Desactivar
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function FormDialog({ datos, onClose, onSaved }) {
  const [f, setF] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!datos?._id;

  useEffect(() => { setF(datos || VACIO); setError(""); }, [datos]);
  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));

  const guardar = async () => {
    if (!f.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) await actualizarRazonSocial(datos._id, f);
      else await crearRazonSocial(f);
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!datos} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? "Editar Razón Social" : "Nueva Razón Social"}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
          <TextField fullWidth size="small" label="Nombre" value={f.nombre} onChange={set("nombre")} />
          <TextField fullWidth size="small" label="RFC" value={f.rfc} onChange={set("rfc")} />
          <TextField fullWidth size="small" label="Domicilio" value={f.domicilio} onChange={set("domicilio")} />
          <TextField fullWidth size="small" label="Teléfono" value={f.telefono} onChange={set("telefono")} />
          <TextField fullWidth size="small" label="Acreditación" value={f.acreditacion} onChange={set("acreditacion")} />
          <FormControlLabel
            control={<Switch checked={!!f.activo} onChange={(e) => setF((s) => ({ ...s, activo: e.target.checked }))} />}
            label="Activa (disponible al cotizar)"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton loading={saving} onClick={guardar} sx={{ borderRadius: 2 }}>Guardar</AppButton>
      </DialogActions>
    </Dialog>
  );
}

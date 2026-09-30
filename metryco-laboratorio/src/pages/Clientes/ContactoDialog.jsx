import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
} from "@mui/material";
import AppInput from "../../shared/components/AppInput";

export default function ContactoDialog({ open, contacto, onClose, onSave, loading }) {
  const isEdit = !!contacto;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { nombre: "", telefono: "", correo: "" } });

  useEffect(() => {
    if (open) {
      reset(contacto
        ? { nombre: contacto.nombre, telefono: contacto.telefono, correo: contacto.correo || "" }
        : { nombre: "", telefono: "", correo: "" });
    }
  }, [open, contacto, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? "Editar Contacto" : "Agregar Contacto"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSave)}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <AppInput
            label="Nombre *"
            error={errors.nombre}
            {...register("nombre", { required: "Campo obligatorio" })}
          />
          <AppInput label="Teléfono" {...register("telefono")} />
          <AppInput label="Correo" {...register("correo")} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>Guardar</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

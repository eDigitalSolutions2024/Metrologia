import { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

/**
 * Botón ⋮ con las acciones secundarias de una fila. Cada acción:
 * { label, icon, onClick, disabled, hint (por qué está deshabilitada), color ("error"...), separador }.
 * Acepta entradas falsas (`rol && {...}`): se ignoran, para armar la lista según permisos.
 * Los clics no se propagan a la fila (por si la tabla tiene onRowClick).
 */
export default function MenuAcciones({ acciones = [] }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const cerrar = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Más acciones">
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
          sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={cerrar} onClick={(e) => e.stopPropagation()}>
        {acciones.filter(Boolean).flatMap((a, i) => [
          a.separador && <Divider key={`sep-${i}`} />,
          <MenuItem key={`${i}-${a.label}`} disabled={a.disabled} onClick={() => { cerrar(); a.onClick?.(); }}>
            {a.icon && <ListItemIcon sx={{ color: a.color ? `${a.color}.main` : undefined }}>{a.icon}</ListItemIcon>}
            <ListItemText
              primary={a.label}
              secondary={a.disabled ? a.hint : undefined}
              slotProps={{ primary: { sx: { color: a.color ? `${a.color}.main` : undefined } } }}
            />
          </MenuItem>,
        ]).filter(Boolean)}
      </Menu>
    </>
  );
}

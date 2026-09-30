import { Fragment, useState } from "react";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import CambiarPasswordDialog from "./CambiarPasswordDialog";
import FotoPerfilDialog from "./FotoPerfilDialog";
import FirmaDialog from "./FirmaDialog";
import ActividadDialog from "./ActividadDialog";

const OPCIONES = [
  { key: "password", label: "Cambiar contraseña", Icon: LockOutlinedIcon },
  { key: "foto", label: "Foto de perfil", Icon: PhotoCameraOutlinedIcon },
  { key: "firma", label: "Firma digital", Icon: DrawOutlinedIcon },
  { key: "actividad", label: "Mis últimos inicios de sesión", Icon: HistoryOutlinedIcon },
];

/** Engranaje del Navbar: menú de configuración de mi propia cuenta (no de administración del sistema). */
export default function ConfiguracionMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(null);

  const abrirDialogo = (key) => {
    setAnchorEl(null);
    setDialogoAbierto(key);
  };

  return (
    <>
      <Tooltip title="Configuración de mi cuenta">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <SettingsOutlinedIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 240, mt: 1 } } }}
      >
        {OPCIONES.map((o, i) => (
          <Fragment key={o.key}>
            {i === OPCIONES.length - 1 && <Divider sx={{ my: 0.5 }} />}
            <MenuItem onClick={() => abrirDialogo(o.key)} sx={{ py: 1 }}>
              <ListItemIcon><o.Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={o.label} />
            </MenuItem>
          </Fragment>
        ))}
      </Menu>

      <CambiarPasswordDialog open={dialogoAbierto === "password"} onClose={() => setDialogoAbierto(null)} />
      <FotoPerfilDialog open={dialogoAbierto === "foto"} onClose={() => setDialogoAbierto(null)} />
      <FirmaDialog open={dialogoAbierto === "firma"} onClose={() => setDialogoAbierto(null)} />
      <ActividadDialog open={dialogoAbierto === "actividad"} onClose={() => setDialogoAbierto(null)} />
    </>
  );
}

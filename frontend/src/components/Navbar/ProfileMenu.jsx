import { Box, Typography, Button } from "@mui/material";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/auth/useAuth";
import ROUTES from "../../shared/constants/routes";

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 1 }}>
      <Typography sx={{ fontWeight: 600 }}>
        {user?.nombre || user?.usuario || "Usuario"}
      </Typography>
      <Button
        onClick={handleLogout}
        startIcon={<LogoutOutlinedIcon />}
        size="small"
        color="error"
        variant="outlined"
        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
      >
        Cerrar sesión
      </Button>
    </Box>
  );
}

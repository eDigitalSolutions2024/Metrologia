import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useAuth } from "../../core/auth/useAuth";
import ROUTES from "../../shared/constants/routes";
import background from "../../assets/metryco-background.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ usuario, password }) => {
    setError("");
    setLoading(true);
    try {
      await login(usuario, password);
      navigate(ROUTES.DASHBOARD);
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Fondo */}
      <Box component="img" src={background} alt="" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -1 }} />

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 5,
          borderRadius: 5,
          boxShadow: "0 25px 60px rgba(0,0,0,.25)",
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Logo */}
        <Box sx={{ textAlign: "center", mb: 4, padding: "5px", margin: "5px 0" }}>
          <Typography
            variant="h4"
            fontWeight={800}
            color="text.primary"
            letterSpacing={1}
          >
            METROLOGÍA
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Laboratorio de Metrología — ERP 2.0
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          <TextField
            label="Usuario"
            size="small"
            fullWidth
            autoFocus
            error={!!errors.usuario}
            helperText={errors.usuario?.message}
            {...register("usuario", { required: "El usuario es obligatorio" })}
            sx={{
              mb: 1.8,
              mt: 1,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          />

          <TextField
            label="Contraseña"
            type={showPass ? "text" : "password"}
            size="small"
            fullWidth
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register("password", {
              required: "La contraseña es obligatoria",
            })}
            sx={{
              mb: 1,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPass((p) => !p)}
                  >
                    {showPass ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              mt: 1,
              bgcolor: "secondary.main",
              "&:hover": { bgcolor: "secondary.dark" },
            }}
          >
            {loading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
          }}
        >
          © {new Date().getFullYear()} Metryco Laboratorio. Todos los derechos
          reservados.
        </Typography>
      </Paper>
    </Box>
  );
}

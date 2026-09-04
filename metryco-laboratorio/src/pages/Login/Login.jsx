import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert,
  Tooltip,
  useColorScheme,
} from "@mui/material";
import { alpha, lighten } from "@mui/material/styles";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useAuth } from "../../core/auth/useAuth";
import ROUTES from "../../shared/constants/routes";
import { logoUrl } from "../../services/configuracion";
import { useLogoMarca } from "../../theme/AppThemeProvider";
import { useColoresMarca } from "../../theme/AppThemeProvider";
import { hexToRgb } from "../../theme/theme";

const YEAR = new Date().getFullYear();

/** Marca del laboratorio: anillo graduado con aguja de medición. */
function BrandMark({ size = 40, color = "currentColor" }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const outer = 21;
    const inner = i % 3 === 0 ? 15 : 18;
    return (
      <line
        key={i}
        x1={24 + outer * Math.cos(angle)}
        y1={24 + outer * Math.sin(angle)}
        x2={24 + inner * Math.cos(angle)}
        y2={24 + inner * Math.sin(angle)}
        stroke={color}
        strokeWidth={i % 3 === 0 ? 2 : 1}
        strokeLinecap="round"
      />
    );
  });

  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      sx={{ width: size, height: size, flexShrink: 0, display: "block" }}
    >
      <circle cx="24" cy="24" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {ticks}
      <line x1="24" y1="24" x2="34" y2="14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.4" fill={color} />
    </Box>
  );
}

function Feature({ icon, children, accentColor }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 38,
          height: 38,
          borderRadius: 2,
          flexShrink: 0,
          color: accentColor,
          bgcolor: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const { colores } = useColoresMarca();
  const rgbSecundario = hexToRgb(colores.secundario);
  const secundarioClaro = lighten(colores.secundario, 0.35);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { logo } = useLogoMarca();

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
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
      } else if (status === 401 || status === 400) {
        setError("Usuario o contraseña incorrectos.");
      } else {
        setError("No se pudo conectar con el servidor. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: "background.paper",
      "& fieldset": { borderColor: "divider" },
      "&:hover fieldset": { borderColor: "text.disabled" },
    },
    // Evita el fondo amarillo (o blanco fijo) del autocompletado del navegador —
    // usa las variables del tema para que respete modo claro/oscuro.
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 100px var(--mui-palette-background-paper) inset",
      WebkitTextFillColor: "var(--mui-palette-text-primary)",
      caretColor: "var(--mui-palette-text-primary)",
      transition: "background-color 9999s ease-in-out 0s",
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
        bgcolor: "background.paper",
      }}
    >
      {/* ---------- Panel de marca ---------- */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 7,
          color: "#E2E8F0",
          background:
            `radial-gradient(1100px 520px at 12% 8%, rgba(${rgbSecundario},0.38), transparent 58%),` +
            "linear-gradient(158deg, #0B1220 0%, #0F172A 48%, #111E3A 100%)",
        }}
      >
        {/* Filigrana: anillos de precisión */}
        <Box
          component="svg"
          viewBox="0 0 400 400"
          aria-hidden
          sx={{
            position: "absolute",
            right: -110,
            bottom: -120,
            width: 520,
            height: 520,
            opacity: 0.07,
            color: secundarioClaro,
          }}
        >
          <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeWidth="2" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="currentColor" strokeWidth="2" />
        </Box>

        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.75 }}>
          <Box sx={{ color: secundarioClaro }}>
            {logo ? (
              <Box component="img" src={logoUrl(logo.nombreArchivo)} alt="Logo" sx={{ width: 44, height: 44, objectFit: "contain" }} />
            ) : (
              <BrandMark size={44} />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: 3, fontSize: 20, lineHeight: 1 }}>
              METROLOGÍA
            </Typography>
            <Typography sx={{ letterSpacing: 6, fontSize: 11, color: "rgba(226,232,240,0.6)" }}>
              LABORATORIO
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: "relative", maxWidth: 460 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 34, lineHeight: 1.2 }}>
            Gestión integral para tu laboratorio de metrología
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 15.5, color: "rgba(226,232,240,0.7)" }}>
            Calibraciones, patrones, trazabilidad y control de calidad en una sola
            plataforma.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 4.5 }}>
            <Feature icon={<PrecisionManufacturingOutlinedIcon fontSize="small" />} accentColor={secundarioClaro}>
              Calibraciones, equipos y patrones centralizados
            </Feature>
            <Feature icon={<VerifiedOutlinedIcon fontSize="small" />} accentColor={secundarioClaro}>
              Trazabilidad metrológica de extremo a extremo
            </Feature>
            <Feature icon={<ShieldOutlinedIcon fontSize="small" />} accentColor={secundarioClaro}>
              Reportes y calidad conforme a ISO/IEC 17025
            </Feature>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ position: "relative", color: "rgba(226,232,240,0.5)" }}>
          © {YEAR} Laboratorio de Metrología. Todos los derechos reservados.
        </Typography>
      </Box>

      {/* ---------- Panel de formulario ---------- */}
      <Box
        sx={[
          {
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 3, sm: 6 },
            py: { xs: 6, sm: 4 },
            overflow: "hidden",
            backgroundImage:
              `radial-gradient(900px 480px at 108% -8%, rgba(${rgbSecundario},0.09), transparent 60%),` +
              `radial-gradient(700px 420px at -8% 108%, rgba(${rgbSecundario},0.05), transparent 55%),` +
              "radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 26px 26px",
            backgroundPosition: "0 0, 0 0, -13px -13px",
          },
          (theme) =>
            theme.applyStyles("dark", {
              backgroundImage:
                `radial-gradient(900px 480px at 108% -8%, rgba(${rgbSecundario},0.16), transparent 60%),` +
                `radial-gradient(700px 420px at -8% 108%, rgba(${rgbSecundario},0.08), transparent 55%),` +
                "radial-gradient(rgba(226,232,240,0.05) 1px, transparent 1px)",
            }),
        ]}
      >
        <Tooltip title={mode === "dark" ? "Modo claro" : "Modo oscuro"}>
          <IconButton
            size="small"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            sx={{ position: "absolute", top: 16, right: 16 }}
          >
            {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Marca compacta (solo móvil) */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              gap: 1.5,
              mb: 4,
              color: "secondary.main",
            }}
          >
            {logo ? (
              <Box component="img" src={logoUrl(logo.nombreArchivo)} alt="Logo" sx={{ width: 38, height: 38, objectFit: "contain" }} />
            ) : (
              <BrandMark size={38} />
            )}
            <Typography
              sx={{ fontWeight: 800, letterSpacing: 3, fontSize: 18, color: "text.primary" }}
            >
              METROLOGÍA
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3.5 }}>
            Ingresa tus credenciales para acceder al panel.
          </Typography>

          {error && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <TextField
              label="Usuario"
              fullWidth
              autoFocus
              autoComplete="username"
              error={!!errors.usuario}
              helperText={errors.usuario?.message}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              {...register("usuario", { required: "El usuario es obligatorio" })}
            />

            <TextField
              label="Contraseña"
              type={showPass ? "text" : "password"}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                },
              }}
              {...register("password", { required: "La contraseña es obligatoria" })}
            />

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              disableElevation
              disabled={loading}
              sx={{
                mt: 0.5,
                py: 1.35,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 15,
                "&.Mui-disabled": { background: (t) => alpha(t.palette.secondary.main, 0.45), color: "#fff" },
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Iniciar sesión"}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 5 }}
          >
            Laboratorio de Metrología — Sistema ERP · © {YEAR}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

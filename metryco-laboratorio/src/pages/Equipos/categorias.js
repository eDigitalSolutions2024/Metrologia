// Mismo catálogo de categorías que usan Equipo y Patrón en el PHP legacy
// (nequipo.php / npatron.php). Se corrigió el typo "Partorsional" -> "Par Torsional".
export const CATEGORIAS = [
  "Presion", "Fuerza", "Masa", "Flujo", "Peso", "Electrica", "Mecanica",
  "Dimensional", "Temperatura", "Temperatura y Humedad", "PH", "Par Torsional", "Volumen",
];

// Un ícono/color por categoría — para identificar de un vistazo el tipo de
// equipo/patrón en tablas y tarjetas (Equipos, Patrones), sin tener que leer
// el texto de la columna "Categoría".
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import FitnessCenterOutlinedIcon from "@mui/icons-material/FitnessCenterOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import WaterOutlinedIcon from "@mui/icons-material/WaterOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SquareFootOutlinedIcon from "@mui/icons-material/SquareFootOutlined";
import ThermostatOutlinedIcon from "@mui/icons-material/ThermostatOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import OpacityOutlinedIcon from "@mui/icons-material/OpacityOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";

export const CATEGORIA_INFO = {
  Presion: { icon: SpeedOutlinedIcon, color: "#2563EB" },
  Fuerza: { icon: FitnessCenterOutlinedIcon, color: "#7C3AED" },
  Masa: { icon: ScaleOutlinedIcon, color: "#059669" },
  Flujo: { icon: WaterOutlinedIcon, color: "#0891B2" },
  Peso: { icon: ScaleOutlinedIcon, color: "#0D9488" },
  Electrica: { icon: BoltOutlinedIcon, color: "#D97706" },
  Mecanica: { icon: SettingsOutlinedIcon, color: "#57534E" },
  Dimensional: { icon: SquareFootOutlinedIcon, color: "#DB2777" },
  Temperatura: { icon: ThermostatOutlinedIcon, color: "#DC2626" },
  "Temperatura y Humedad": { icon: WaterDropOutlinedIcon, color: "#EA580C" },
  PH: { icon: ScienceOutlinedIcon, color: "#65A30D" },
  "Par Torsional": { icon: SyncOutlinedIcon, color: "#4F46E5" },
  Volumen: { icon: OpacityOutlinedIcon, color: "#0EA5E9" },
};

export function iconoCategoria(categoria) {
  return CATEGORIA_INFO[categoria]?.icon || CategoryOutlinedIcon;
}

export function colorCategoria(categoria) {
  return CATEGORIA_INFO[categoria]?.color || "#64748B";
}

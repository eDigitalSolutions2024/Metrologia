/*
========================================================
METROLOGÍA ERP · configuración del menú lateral

El Sidebar lee este archivo. Estructura: grupos con
un rótulo de sección y sus ítems (con o sin hijos).

`roles`: qué roles ven ese ítem/hijo POR DEFECTO. Basado en los niveles
0/1/2 del sistema PHP original (index.php): 0=admin ve todo,
1=técnico (Reportes-consultar, Equipo, Calibraciones), 2=ventas
(Clientes, Cotización, Reportes-consultar, Equipo básico,
Cobranza-solo-consultar). "coordinador" no existe en el legacy
(solo nivel 0 veía Calidad) — se definió como "admin menos
Administración" (decisión 2026-08-28). Omitir `roles` = visible
para todos los roles autenticados.

Desde 2026-08-29 estos valores son solo el DEFAULT: un admin puede
sobreescribirlos en vivo desde Administración → Roles del Menú (se
guardan en Mongo, ver services/configuracion.js). La sección
"Administración" queda excluida de esa pantalla a propósito — siempre
es admin-only, para que nadie pueda bloquearse a sí mismo el acceso.
========================================================
*/
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";

export const ROLES = ["admin", "coordinador", "ventas", "tecnico"];
export const ROL_LABELS = { admin: "Admin", coordinador: "Coordinador", ventas: "Ventas", tecnico: "Técnico" };

const ADMIN_COORD = ["admin", "coordinador"];
const ADMIN_COORD_VENTAS = ["admin", "coordinador", "ventas"];
const ADMIN_COORD_TECNICO = ["admin", "coordinador", "tecnico"];
const TODOS = ["admin", "coordinador", "ventas", "tecnico"];

const menu = [
  {
    section: "Principal",
    items: [{ title: "Dashboard", icon: SpaceDashboardOutlinedIcon, path: "/", roles: TODOS }],
  },
  {
    section: "Operación",
    items: [
      {
        title: "Reportes",
        icon: FactCheckOutlinedIcon,
        roles: TODOS,
        children: [
          { title: "Consultar", path: "/reportes", roles: TODOS },
          { title: "Mis Asignaciones", path: "/reportes/mis-asignaciones", roles: ADMIN_COORD_TECNICO },
          { title: "Certificados", path: "/reportes/certificados", roles: ADMIN_COORD },
          { title: "Exportar", path: "/reportes/exportar", roles: ADMIN_COORD_VENTAS },
        ],
      },
      {
        title: "Calidad",
        icon: ScienceOutlinedIcon,
        roles: ADMIN_COORD,
        children: [{ title: "Consultar", path: "/calidad", roles: ADMIN_COORD }],
      },
      {
        title: "Equipos",
        icon: PrecisionManufacturingOutlinedIcon,
        roles: TODOS,
        children: [
          { title: "Alta de Equipo", path: "/equipos/nuevo", roles: TODOS },
          { title: "Consultar Equipos", path: "/equipos", roles: TODOS },
          { title: "Historial Certificados", path: "/equipos/historial-certificados", roles: ADMIN_COORD_TECNICO },
          { title: "Alta de Patrón", path: "/equipos/patrones/nuevo", roles: ADMIN_COORD_TECNICO },
          { title: "Consultar Patrones", path: "/equipos/patrones", roles: ADMIN_COORD_TECNICO },
        ],
      },
      {
        title: "Performance",
        icon: SpeedOutlinedIcon,
        roles: ADMIN_COORD_TECNICO,
        children: [
          { title: "Consultar", path: "/performance", roles: ADMIN_COORD_TECNICO },
          { title: "Incertidumbre", path: "/incertidumbre", roles: ADMIN_COORD_TECNICO },
        ],
      },
      {
        title: "Actividades",
        icon: CalendarMonthOutlinedIcon,
        roles: ADMIN_COORD,
        children: [{ title: "Calendario", path: "/actividades", roles: ADMIN_COORD }],
      },
    ],
  },
  {
    section: "Comercial",
    items: [
      {
        title: "Clientes",
        icon: GroupsOutlinedIcon,
        roles: ADMIN_COORD_VENTAS,
        children: [
          { title: "Nuevo Cliente", path: "/clientes/nuevo", roles: ADMIN_COORD_VENTAS },
          { title: "Consultar Clientes", path: "/clientes", roles: ADMIN_COORD_VENTAS },
        ],
      },
      { title: "Cotizaciones", icon: RequestQuoteOutlinedIcon, path: "/cotizaciones", roles: ADMIN_COORD_VENTAS },
      {
        title: "Cuentas por Cobrar",
        icon: PaymentsOutlinedIcon,
        roles: ADMIN_COORD_VENTAS,
        children: [
          { title: "Administrar Pagos", path: "/cobranza", roles: ADMIN_COORD },
          { title: "Consultar Calendario", path: "/cobranza/calendario", roles: ADMIN_COORD_VENTAS },
        ],
      },
    ],
  },
  {
    // "Administración" NO participa en la personalización de roles — siempre
    // admin-only, fijo en código, para que nunca se pueda bloquear el acceso
    // a la pantalla que controla los permisos de todo lo demás.
    section: "Sistema",
    items: [
      {
        title: "Administración",
        icon: AdminPanelSettingsOutlinedIcon,
        roles: ["admin"],
        children: [
          { title: "Usuarios", path: "/usuarios", roles: ["admin"] },
          { title: "General", path: "/general", roles: ["admin"] },
          { title: "Roles del Menú", path: "/administracion/roles-menu", roles: ["admin"] },
          { title: "Datos del Laboratorio", path: "/administracion/laboratorio", roles: ["admin"] },
          { title: "Colores", path: "/administracion/colores", roles: ["admin"] },
        ],
      },
    ],
  },
];

/** Key estable por ítem: su ruta si la tiene, si no su título. */
export function menuKey(item) {
  return item.path || item.title;
}

/**
 * Lista plana de todos los ítems personalizables (todo menos "Administración",
 * que se excluye a propósito) — la usa la pantalla de edición de permisos.
 * Cada fila trae {key, seccion, grupo, titulo, icon, rolesPorDefecto}.
 */
export function itemsPersonalizables() {
  const filas = [];
  for (const grupo of menu) {
    if (grupo.section === "Sistema") continue;
    for (const item of grupo.items) {
      filas.push({ key: menuKey(item), seccion: grupo.section, grupo: null, titulo: item.title, icon: item.icon, rolesPorDefecto: item.roles || ROLES });
      for (const hijo of item.children || []) {
        filas.push({ key: menuKey(hijo), seccion: grupo.section, grupo: item.title, titulo: hijo.title, icon: null, rolesPorDefecto: hijo.roles || ROLES });
      }
    }
  }
  return filas;
}

export default menu;

/*
========================================================
METROLOGÍA ERP · configuración del menú lateral

El Sidebar lee este archivo. Estructura: grupos con
un rótulo de sección y sus ítems (con o sin hijos).
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

const menu = [
  {
    section: "Principal",
    items: [{ title: "Dashboard", icon: SpaceDashboardOutlinedIcon, path: "/" }],
  },
  {
    section: "Operación",
    items: [
      {
        title: "Reportes",
        icon: FactCheckOutlinedIcon,
        children: [
          { title: "Consultar", path: "/reportes" },
          { title: "Certificados", path: "/reportes/certificados" },
          { title: "Exportar", path: "/reportes/exportar" },
        ],
      },
      {
        title: "Calidad",
        icon: ScienceOutlinedIcon,
        children: [{ title: "Consultar", path: "/calidad" }],
      },
      {
        title: "Equipos",
        icon: PrecisionManufacturingOutlinedIcon,
        children: [
          { title: "Alta de Equipo", path: "/equipos/nuevo" },
          { title: "Consultar Equipos", path: "/equipos" },
          { title: "Historial Certificados", path: "/equipos/historial-certificados" },
          { title: "Alta de Patrón", path: "/equipos/patrones/nuevo" },
          { title: "Consultar Patrones", path: "/equipos/patrones" },
        ],
      },
      {
        title: "Performance",
        icon: SpeedOutlinedIcon,
        children: [
          { title: "Consultar", path: "/performance" },
          { title: "Incertidumbre", path: "/incertidumbre" },
        ],
      },
      {
        title: "Actividades",
        icon: CalendarMonthOutlinedIcon,
        children: [{ title: "Calendario", path: "/actividades" }],
      },
    ],
  },
  {
    section: "Comercial",
    items: [
      {
        title: "Clientes",
        icon: GroupsOutlinedIcon,
        children: [
          { title: "Nuevo Cliente", path: "/clientes/nuevo" },
          { title: "Consultar Clientes", path: "/clientes" },
        ],
      },
      { title: "Cotizaciones", icon: RequestQuoteOutlinedIcon, path: "/cotizaciones" },
      {
        title: "Cuentas por Cobrar",
        icon: PaymentsOutlinedIcon,
        children: [
          { title: "Administrar Pagos", path: "/cobranza" },
          { title: "Consultar Calendario", path: "/cobranza/calendario" },
        ],
      },
    ],
  },
  {
    section: "Sistema",
    items: [
      {
        title: "Administración",
        icon: AdminPanelSettingsOutlinedIcon,
        children: [
          { title: "Usuarios", path: "/usuarios" },
          { title: "General", path: "/general" },
        ],
      },
    ],
  },
];

export default menu;

/*
========================================================

METRYCO ERP

Archivo:
menuConfig.js

Descripción:

Aquí vive toda la configuración del menú lateral.

El Sidebar leerá este archivo para construir
automáticamente el menú.

========================================================
*/

import DashboardIcon from "@mui/icons-material/Dashboard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupsIcon from "@mui/icons-material/Groups";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ScienceIcon from "@mui/icons-material/Science";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PaymentsIcon from "@mui/icons-material/Payments";

const menu = [

    {
        title: "Dashboard",
        icon: DashboardIcon,
        path: "/"
    },

    {
        title: "Administración",
        icon: AdminPanelSettingsIcon,
        children: [
            {
                title: "Usuarios",
                path: "/usuarios"
            },
            {
                title: "General",
                path: "/general"
            }
        ]
    },

    {
        title: "Clientes",
        icon: GroupsIcon,
        children: [
            {
                title: "Nuevo Cliente",
                path: "/clientes/nuevo"
            },
            {
                title: "Consultar Clientes",
                path: "/clientes"
            }
        ]
    },

    {
        title: "Cotizaciones",
        icon: DescriptionIcon,
        path: "/cotizaciones"
    },

    {
        title: "Reportes",
        icon: FactCheckIcon,
        children: [
            {
                title: "Consultar",
                path: "/reportes"
            },
            {
                title: "Exportar",
                path: "/reportes/exportar"
            }
        ]
    },

    {
        title: "Calidad",
        icon: ScienceIcon,
        children: [
            {
                title: "Consultar",
                path: "/calidad"
            }
        ]
    },

    {
        title: "Equipos",
        icon: PrecisionManufacturingIcon,
        children: [
            {
                title: "Alta de Equipo",
                path: "/equipos/nuevo"
            },
            {
                title: "Consultar Equipos",
                path: "/equipos"
            },
            {
                title: "Patrones",
                path: "/equipos/patrones"
            }
        ]
    },

    {
        title: "Actividades",
        icon: CalendarMonthIcon,
        children: [
            {
                title: "Calendario",
                path: "/actividades"
            }
        ]
    },

    {
        title: "Cuentas por Cobrar",
        icon: PaymentsIcon,
        children: [
            {
                title: "Administrar Pagos",
                path: "/cobranza"
            }
        ]
    }

];

export default menu;
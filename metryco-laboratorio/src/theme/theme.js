import { createTheme } from "@mui/material/styles";

/* ------------------------------------------------------------------ *
 *  Paleta                                                             *
 * ------------------------------------------------------------------ */
const light = {
  primary:   { main: "#0F172A", light: "#334155", dark: "#020617", contrastText: "#fff" },
  secondary: { main: "#2563EB", light: "#3B82F6", dark: "#1D4ED8", contrastText: "#fff" },
  success:   { main: "#16A34A", light: "#22C55E", dark: "#15803D" },
  warning:   { main: "#D97706", light: "#F59E0B", dark: "#B45309" },
  error:     { main: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
  info:      { main: "#0891B2", light: "#06B6D4", dark: "#0E7490" },
  background:{ default: "#F6F8FC", paper: "#FFFFFF" },
  text:      { primary: "#0F172A", secondary: "#5B6B7C" },
  divider:   "#E4E9F2",
};

const dark = {
  primary:   { main: "#E2E8F0", light: "#F1F5F9", dark: "#CBD5E1", contrastText: "#0B1220" },
  secondary: { main: "#3B82F6", light: "#60A5FA", dark: "#2563EB", contrastText: "#fff" },
  success:   { main: "#22C55E" },
  warning:   { main: "#F59E0B" },
  error:     { main: "#F87171" },
  info:      { main: "#22D3EE" },
  background:{ default: "#080D16", paper: "#0F1826" },
  text:      { primary: "#E6EDF6", secondary: "#93A4B7" },
  divider:   "#1E2A3C",
};

/* sombras suaves y en capas (look "producto", no material clásico) */
const softShadows = [
  "none",
  "0 1px 2px rgba(15,23,42,.06)",
  "0 2px 6px rgba(15,23,42,.06)",
  "0 4px 12px rgba(15,23,42,.07)",
  "0 8px 20px rgba(15,23,42,.08)",
  "0 14px 32px rgba(15,23,42,.10)",
  "0 20px 44px rgba(15,23,42,.12)",
  ...Array(18).fill("0 24px 60px rgba(15,23,42,.14)"),
];

const theme = createTheme({
  cssVariables: true,
  colorSchemes: { light: { palette: light }, dark: { palette: dark } },
  colorSchemeSelector: "class", // permite que el toggle claro/oscuro tenga efecto
  shape: { borderRadius: 14 },
  shadows: softShadows,

  typography: {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    h3: { fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.1 },
    h4: { fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.12 },
    h5: { fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 },
    h6: { fontWeight: 700, letterSpacing: "-0.012em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body2: { letterSpacing: "-0.005em" },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    caption: { letterSpacing: 0 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "::-webkit-scrollbar": { width: 10, height: 10 },
        "::-webkit-scrollbar-thumb": {
          background: "var(--mui-palette-divider)",
          borderRadius: 999,
          border: "2px solid transparent",
          backgroundClip: "content-box",
        },
        "::-webkit-scrollbar-thumb:hover": { background: "var(--mui-palette-text-secondary)", backgroundClip: "content-box" },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "var(--mui-palette-divider)" },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 11, paddingInline: 17, paddingBlock: 7.5,
          transition: "background .16s ease, box-shadow .16s ease, transform .06s ease",
          "&:active": { transform: "translateY(1px)" },
        },
        sizeLarge: { paddingBlock: 10, paddingInline: 22, fontSize: 15 },
        containedSecondary: {
          background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
          boxShadow: "0 6px 16px rgba(37,99,235,.28)",
          "&:hover": { background: "linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)", boxShadow: "0 8px 22px rgba(37,99,235,.34)" },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          "&:hover": { background: "linear-gradient(135deg, #0F172A 0%, #020617 100%)" },
        },
        outlined: { borderColor: "var(--mui-palette-divider)", "&:hover": { borderColor: "var(--mui-palette-text-disabled)", background: "var(--mui-palette-action-hover)" } },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "box-shadow .15s ease, border-color .15s ease",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--mui-palette-divider)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--mui-palette-text-disabled)" },
          "&.Mui-focused": { boxShadow: "0 0 0 4px rgba(37,99,235,.12)" },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        outlined: { borderColor: "var(--mui-palette-divider)" },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "var(--mui-palette-divider)", fontVariantNumeric: "tabular-nums" },
        head: {
          fontWeight: 700, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase",
          color: "var(--mui-palette-text-secondary)", background: "var(--mui-palette-background-default)",
        },
      },
    },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiToggleButton: { styleOverrides: { root: { borderRadius: 10, textTransform: "none" } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: "rgba(15,23,42,.94)", padding: "6px 10px",
          backdropFilter: "blur(4px)",
        },
        arrow: { color: "rgba(15,23,42,.94)" },
      },
    },

    MuiDialog: { styleOverrides: { paper: { borderRadius: 18, backgroundImage: "none" } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 12, boxShadow: softShadows[4] } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 12, boxShadow: softShadows[4] } } },
    MuiSelect: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 6 } } },
  },
});

export default theme;

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0F172A",
        },

        secondary: {
          main: "#2563EB",
        },

        background: {
          default: "#F4F7FC",
          paper: "#FFFFFF",
        },

        success: {
          main: "#22C55E",
        },

        warning: {
          main: "#F59E0B",
        },

        error: {
          main: "#EF4444",
        },
      },
    },

    dark: {
      palette: {
        primary: {
          main: "#E2E8F0",
        },

        secondary: {
          main: "#3B82F6",
        },

        background: {
          default: "#0B1220",
          paper: "#141C2B",
        },

        success: {
          main: "#22C55E",
        },

        warning: {
          main: "#F59E0B",
        },

        error: {
          main: "#F87171",
        },
      },
    },
  },

  typography: {
    fontFamily: "Inter, sans-serif",

    h4: {
      fontWeight: 700,
    },

    h5: {
      fontWeight: 600,
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 14,
  },
});

/*const theme = createTheme({
  light: {
    primary: {
      main: "#0F172A",
    },

    secondary: {
      main: "#2563EB",
    },

    background: {
      default: "#F4F7FC",
      paper: "#FFFFFF",
    },

    success: {
      main: "#22C55E",
    },

    warning: {
      main: "#F59E0B",
    },

    error: {
      main: "#EF4444",
    },
  },

  typography: {
    fontFamily: "Inter, sans-serif",

    h4: {
      fontWeight: 700,
    },

    h5: {
      fontWeight: 600,
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 14,
  },

  dark:{

  }
});*/

export default theme;

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { crearTheme, COLORES_MARCA_DEFAULT } from "./theme";
import { obtenerColores } from "../services/configuracion";

const ColoresMarcaContext = createContext({ colores: COLORES_MARCA_DEFAULT, refrescarColores: () => {} });

/** Lo llama la pantalla de Administración → Colores tras guardar, para aplicar el cambio sin recargar. */
export function useColoresMarca() {
  return useContext(ColoresMarcaContext);
}

/**
 * Reemplaza el <ThemeProvider theme={theme}> estático: carga los colores de
 * marca guardados en Configuracion (o los default si nadie los ha cambiado)
 * y construye el theme de MUI en runtime — así Administración → Colores no
 * necesita rebuild ni reinicio del backend.
 */
export default function AppThemeProvider({ children }) {
  const [colores, setColores] = useState(COLORES_MARCA_DEFAULT);

  const refrescarColores = useCallback(() => {
    obtenerColores().then(setColores).catch(() => {});
  }, []);

  useEffect(() => { refrescarColores(); }, [refrescarColores]);

  const theme = useMemo(() => crearTheme(colores), [colores]);

  return (
    <ColoresMarcaContext.Provider value={{ colores, refrescarColores }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColoresMarcaContext.Provider>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { crearTheme, COLORES_MARCA_DEFAULT } from "./theme";
import { obtenerColores, obtenerLogo } from "../services/configuracion";

const MarcaContext = createContext({
  colores: COLORES_MARCA_DEFAULT, refrescarColores: () => {},
  logo: null, refrescarLogo: () => {},
});

/** Lo llama la pantalla de Administración → Colores tras guardar, para aplicar el cambio sin recargar. */
export function useColoresMarca() {
  return useContext(MarcaContext);
}

/** Lo llama Administración → Datos del Laboratorio tras subir/quitar el logo,
 * para que Sidebar/Login lo reflejen al instante sin recargar la página. */
export function useLogoMarca() {
  return useContext(MarcaContext);
}

/**
 * Reemplaza el <ThemeProvider theme={theme}> estático: carga los colores de
 * marca guardados en Configuracion (o los default si nadie los ha cambiado)
 * y construye el theme de MUI en runtime — así Administración → Colores no
 * necesita rebuild ni reinicio del backend.
 */
export default function AppThemeProvider({ children }) {
  const [colores, setColores] = useState(COLORES_MARCA_DEFAULT);
  const [logo, setLogo] = useState(null);

  const refrescarColores = useCallback(() => {
    obtenerColores().then(setColores).catch(() => {});
  }, []);
  const refrescarLogo = useCallback(() => {
    obtenerLogo().then(setLogo).catch(() => setLogo(null));
  }, []);

  useEffect(() => { refrescarColores(); refrescarLogo(); }, [refrescarColores, refrescarLogo]);

  const theme = useMemo(() => crearTheme(colores), [colores]);

  return (
    <MarcaContext.Provider value={{ colores, refrescarColores, logo, refrescarLogo }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MarcaContext.Provider>
  );
}

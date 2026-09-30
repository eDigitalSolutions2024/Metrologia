import { useEffect, useRef } from "react";

/**
 * Refresca `fn` en segundo plano cada `ms` mientras el componente sigue
 * montado — mismo criterio "casi en vivo" usado en AlertasFlotantes y
 * Facturación: no reemplaza un refresco real por acciones del propio
 * usuario (crear/editar/eliminar siguen llamando `fn` directo), solo evita
 * que haya que recargar la página para ver cambios hechos por otro usuario
 * (u otra pestaña) mientras la pantalla sigue abierta.
 *
 * `fn` se guarda en un ref para no tener que memoizarla con useCallback en
 * cada pantalla que la use — solo se lee la versión más reciente al disparar
 * cada intervalo, no reinicia el timer en cada render.
 */
export function usePolling(fn, ms = 20000, activo = true) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    if (!activo) return undefined;
    const id = setInterval(() => fnRef.current(), ms);
    return () => clearInterval(id);
  }, [ms, activo]);
}

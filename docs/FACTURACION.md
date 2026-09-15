# Facturación (CFDI 4.0) — METRYCO

> Estado: **Fase 2 completa** (modelo fiscal, validaciones, cálculos, CRUD, UI). **Sin PAC conectado** — no se puede timbrar de verdad todavía.

## 1. Dos módulos distintos, a propósito

| | Cuentas por Cobrar (Cobranza) | Facturación (CFDI) |
|---|---|---|
| Modelo | `Factura` | `ComprobanteFiscal` |
| Qué controla | Si se cobró o no, cuándo vence | El comprobante fiscal formal ante el SAT |
| Ciclo de vida | `statusPago`: pendiente / pagada | `estado`: borrador → timbrada → cancelada |
| Ruta backend | `/api/cobranza` | `/api/cfdi` |
| Pantalla | Cuentas por Cobrar / Calendario de Pagos | Facturación (CFDI) |

**Por qué se separaron en dos modelos en vez de extender `Factura`:** `Factura.statusPago` (cobro) y el estado fiscal de un CFDI son dos ciclos de vida independientes — una factura se puede cobrar sin CFDI (como ya pasaba antes de esta fase) y, al revés, cancelar un CFDI no debe tocar el registro de cobro ya hecho. Mezclarlos en un solo documento obligaba a cargar campos fiscales vacíos en cada registro de Cobranza. `Factura.js` **no se modificó** — Cobranza sigue funcionando exactamente igual que antes.

Un `ComprobanteFiscal` puede ligarse opcionalmente a una `Factura`, una `Cotizacion` o un `Reporte` (todos opcionales, igual criterio que ya usaba `Factura.cotizacion`), o quedar suelto.

## 2. Arquitectura

```
models/ComprobanteFiscal.js       — el CFDI: emisor/receptor (snapshot), conceptos, impuestos, totales, estado, uuid/xml
schemas/cfdi.schema.js            — validación Zod (crear/actualizar/cancelar)
services/cfdi.service.js          — reglas de negocio: cálculo de totales, validación de datos fiscales, timbrar/cancelar
services/pac/
  PacProvider.js                  — interfaz que debe implementar cualquier adaptador de PAC real
  PacNotConfiguredError.js        — error controlado (503, code PAC_NOT_CONFIGURED)
  pac.config.js                   — lee PAC_* del .env, expone `configurado: boolean`
  pacFactory.js                   — entrega la instancia del adaptador, o lanza PacNotConfiguredError
  providers/                      — VACÍO. Aquí se agrega el adaptador real cuando se contrate un PAC.
controllers/cfdi.controller.js
routes/cfdi.routes.js             — montado en /api/cfdi

pages/Facturacion/
  FacturacionPage.jsx             — listado + filtros + stats
  CrearCfdiDialog.jsx             — alta de borrador con conceptos
  CfdiDetalleDialog.jsx           — detalle, timbrar, cancelar, descargar XML/PDF
  estadosCfdi.js                  — mapa de estado -> {label, color} (compartido)
services/cfdi.js                  — cliente HTTP del módulo
```

## 3. Modelo de datos (`ComprobanteFiscal`)

- **Emisor/receptor**: se guardan como **snapshot** al crear el borrador (mismo criterio que `Certificado.clienteSnapshot`) — si después se edita el Cliente o la Configuración del laboratorio, un CFDI ya generado no cambia retroactivamente.
- **Conceptos**: `claveProdServ`, `claveUnidad` (catálogos SAT — se capturan como texto libre, **no se inventó ningún catálogo**, ver §7), cantidad, valor unitario, impuestos por concepto.
- **Totales**: `subtotal`, `totalImpuestosTrasladados`, `totalImpuestosRetenidos`, `descuento`, `total` — **siempre recalculados en el backend** (`cfdi.service.calcularTotales`) a partir de `conceptos`, nunca confiados del body del request.
- **Estado**: `borrador → pendiente_timbrar → timbrando → timbrada → cancelada`, o `error_timbrado` si el PAC rechaza el timbrado (puede reintentarse, vuelve a `borrador`).
- **Solo se llenan con una respuesta real del PAC** (nunca simulados): `uuid`, `xml`, `selloSat`, `cadenaOriginal`, `fechaTimbrado`.

## 4. Endpoints (`/api/cfdi`, todos requieren sesión)

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/` | cualquiera autenticado | Listar (filtros `clienteId`, `estado`) |
| GET | `/:id` | cualquiera autenticado | Detalle |
| GET | `/:id/xml` | cualquiera autenticado | Descarga el XML timbrado (404 si aún no existe) |
| GET | `/:id/pdf` | cualquiera autenticado | Descarga el PDF fiscal (requiere PAC + timbrado) |
| POST | `/` | admin, coordinador | Crear borrador (calcula totales, valida datos fiscales) |
| PUT | `/:id` | admin, coordinador | Editar — **solo si `estado` es `borrador` o `error_timbrado`** |
| POST | `/:id/timbrar` | admin, coordinador | Timbra vía el PAC configurado — 503 `PAC_NOT_CONFIGURED` si no hay uno |
| POST | `/:id/cancelar` | admin, coordinador | Cancela ante el PAC — solo si `estado === "timbrada"` |

## 5. Validaciones implementadas

- **Emisor**: antes de crear un borrador, se exige que Administración → Datos del Laboratorio tenga `rfc`, `regimenFiscal` y `codigoPostalFiscal` — si falta alguno, error 409 con la lista exacta de qué falta.
- **Receptor**: se exige que el Cliente tenga `rfc`, `regimenFiscal`, `usoCFDI` y `domicilioFiscal.cp` — mismo criterio, error 409 explícito.
- **Conceptos**: cantidad > 0, valor unitario ≥ 0, clave SAT y clave de unidad obligatorias (Zod, antes de tocar la base de datos).
- **No editar un CFDI ya timbrado/cancelado** — solo `borrador`/`error_timbrado` son editables.
- **No timbrar dos veces** — solo se timbra desde `borrador`, `pendiente_timbrar` o `error_timbrado`; mientras se timbra, el estado pasa a `timbrando` para evitar timbrados dobles en paralelo (aunque sin PAC real esto no puede probarse con concurrencia de verdad todavía).
- **No cancelar algo no timbrado** — solo desde `estado === "timbrada"`.

Verificado con un script de datos reales (mismo patrón que usa todo el proyecto, no hay Jest/Mocha instalado): bloqueo de emisor incompleto, bloqueo de receptor incompleto, rechazo de Zod ante cantidad negativa, cálculo correcto de subtotal/IVA/total con conceptos mixtos (con y sin impuesto), `PAC_NOT_CONFIGURED` al timbrar, no-edición de un comprobante timbrado, no-cancelación sin PAC, y confirmación de que `Factura`/Cobranza siguen funcionando exactamente igual.

## 6. Configuración fiscal del emisor

Administración → Datos del Laboratorio → sección "Datos fiscales (CFDI)":
- **Régimen fiscal** (catálogo SAT `c_RegimenFiscal`, ej. `601`)
- **Código postal fiscal** (lugar de expedición)
- **Serie CFDI** (opcional)

El RFC se toma del campo "RFC" ya existente arriba de esa misma pantalla.

## 7. Sobre los catálogos SAT (clave de producto/servicio, clave de unidad, forma de pago)

**No se generó ningún catálogo inventado.** `claveProdServ` y `claveUnidad` son campos de texto libre en el formulario de alta — el usuario los captura consultando los catálogos oficiales del SAT (`c_ClaveProdServ`, `c_ClaveUnidad`). La "Forma de pago" sí tiene un select con las opciones más comunes (01 Efectivo, 02 Cheque, 03 Transferencia, 04 Tarjeta crédito, 28 Tarjeta débito, 99 Por definir) porque ese catálogo es corto y estable; el resto son demasiado extensos para hardcodear sin una fuente de datos real.

## 8. Cómo conectar un PAC real (lo único que falta)

1. Contratar un PAC (Facturama, SW Sapien, Finkok, u otro) y obtener credenciales de **sandbox**.
2. Configurar en `.env`: `PAC_PROVIDER`, `PAC_API_KEY`, `PAC_API_SECRET` (si aplica), `PAC_BASE_URL`, `PAC_SANDBOX=true`.
3. Crear `services/pac/providers/<nombre>.js` que extienda `PacProvider` e implemente `timbrarFactura`, `cancelarFactura`, `consultarFactura`, `obtenerPdf` usando el SDK/API real del proveedor.
4. Registrar el adaptador en `pacFactory.js` (línea comentada de ejemplo ya está ahí).
5. Probar timbrando en modo sandbox antes de pasar a producción (`PAC_SANDBOX=false`).

Nada de esto requiere volver a tocar `cfdi.service.js`, el controller, las rutas ni el frontend — todos ya hablan con la interfaz `PacProvider`, no con un proveedor específico.

## 9. Pendientes conocidos

- Sin PAC conectado, el flujo termina en "borrador" — no hay CFDI real todavía.
- No hay endpoint de `DELETE` para borradores (se puede agregar si hace falta limpiar borradores de prueba).
- El PDF fiscal lo debe devolver el PAC (`pac.obtenerPdf`) — este sistema no genera un PDF propio con diseño de factura; si se quiere un PDF con la plantilla visual de METRYCO además del XML/PDF oficial del PAC, es trabajo adicional de diseño (no técnico-fiscal).
- No hay pruebas de concurrencia real (dos timbrados simultáneos) — el estado `timbrando` reduce el riesgo pero no está probado con carga real.

## 10. Qué necesita el negocio para avanzar

- Elegir el PAC.
- Cuenta con ambiente sandbox de ese PAC.
- Confirmar el régimen fiscal y CP fiscal reales del laboratorio (se capturan en Administración, no en código).
- Decidir si van a timbrar con el CSD (certificado de sello digital) propio del laboratorio subido al PAC, o si el PAC lo maneja de otra forma — varía por proveedor, hay que revisar su documentación al elegir uno.

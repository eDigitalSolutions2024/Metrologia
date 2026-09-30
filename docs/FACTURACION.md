# Facturación (CFDI 4.0) — METRYCO

> Estado: **Fase 3 completa + generador de XML** (Fase 2 + idempotencia, reintentos, adaptador robustecido, comparación de proveedores, pruebas de integración con PAC falso, y ahora `cfdiBuilder.js` genera y valida el XML CFDI 4.0 real antes de timbrar). **Sin PAC conectado** — no se puede timbrar de verdad todavía, y sigue siendo imposible marcar algo como timbrado sin una respuesta real y completa del proveedor.

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
services/cfdiBuilder.js           — genera y VALIDA el XML CFDI 4.0 real (formato, no solo "existe") — ver §5 y §8
services/pac/
  PacProvider.js                  — interfaz: timbrarFactura, cancelarFactura, consultarFactura, obtenerXml, obtenerPdf
  PacError.js                     — error de un PAC real (auth/validación/timeout) — code "PAC_ERROR", retryable: bool
  PacNotConfiguredError.js        — error controlado (503, code PAC_NOT_CONFIGURED) — "no hay proveedor conectado"
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
- **Formato CFDI 4.0 real, no solo "el campo no está vacío"** (`cfdiBuilder.validarComprobante`, corre al crear el borrador Y otra vez justo antes de timbrar): RFC de emisor/receptor con el patrón real de un RFC (3-4 letras + 6 dígitos + 3 alfanumérico), código postal de 5 dígitos, clave de producto/servicio de 6-8 dígitos, método de pago solo PUE/PPD, y consistencia objeto-de-impuesto↔impuestos (un concepto "02" debe traer impuestos, uno "01" no puede traerlos). Si algo no cumple, reporta **todos** los problemas encontrados de una vez, no solo el primero.
- **No editar un CFDI ya timbrado/cancelado** — solo `borrador`/`error_timbrado` son editables.
- **No timbrar dos veces (idempotencia real, no solo de nombre)** — la transición a `timbrando` es un `findOneAndUpdate` atómico (compare-and-swap) contra Mongo: si dos requests de timbrado llegan casi al mismo tiempo, solo uno gana la transición; el otro recibe 409 antes de siquiera contactar al PAC. **Probado con dos timbrados en paralelo de verdad (`Promise.allSettled`), no solo en teoría — ver §9.**
- **No cancelar algo no timbrado** — solo desde `estado === "timbrada"`.
- **No marcar timbrada una respuesta incompleta del PAC** — si el adaptador "resuelve" sin lanzar error pero la respuesta no trae `uuid` y `xml`, el motor la rechaza igual (ver hallazgo en §9, corregido).
- **Reintento acotado** — solo para errores que el adaptador marca `retryable: true` (red/timeout), y **un único reintento**, nunca en bucle. Un error de validación del PAC (RFC inválido, etc.) nunca se reintenta solo.
- **Objeto de impuesto "01" nunca lleva IVA** — aunque el request incluya un array `impuestos` para un concepto marcado como "No objeto de impuesto", el motor lo ignora al calcular (hallazgo de la revisión de calidad, corregido).
- **Referencias opcionales validadas** — si se manda `factura`/`cotizacion`/`reporte` al crear, deben apuntar a un registro real o se rechaza con 404.

Verificado con dos scripts de datos reales (mismo patrón que usa todo el proyecto, no hay Jest/Mocha instalado — ver §9 para el de integración PAC, que sí quedó permanente en `scripts/`): bloqueo de emisor incompleto, bloqueo de receptor incompleto, rechazo de Zod ante cantidad negativa, cálculo correcto de subtotal/IVA/total con conceptos mixtos (con y sin impuesto), `PAC_NOT_CONFIGURED` al timbrar, no-edición de un comprobante timbrado, no-cancelación sin PAC, confirmación de que `Factura`/Cobranza siguen funcionando exactamente igual, y los 10 casos de integración con PAC falso.

## 6. Configuración fiscal del emisor

Administración → Datos del Laboratorio → sección "Datos fiscales (CFDI)":
- **Régimen fiscal** (catálogo SAT `c_RegimenFiscal`, ej. `601`)
- **Código postal fiscal** (lugar de expedición)
- **Serie CFDI** (opcional)

El RFC se toma del campo "RFC" ya existente arriba de esa misma pantalla.

## 7. Sobre los catálogos SAT (clave de producto/servicio, clave de unidad, forma de pago)

**No se generó ningún catálogo inventado.** `claveProdServ` y `claveUnidad` son campos de texto libre en el formulario de alta — el usuario los captura consultando los catálogos oficiales del SAT (`c_ClaveProdServ`, `c_ClaveUnidad`). La "Forma de pago" sí tiene un select con las opciones más comunes (01 Efectivo, 02 Cheque, 03 Transferencia, 04 Tarjeta crédito, 28 Tarjeta débito, 99 Por definir) porque ese catálogo es corto y estable; el resto son demasiado extensos para hardcodear sin una fuente de datos real.

## 7.1 Material de referencia oficial usado para validar el XML

- **Guía de llenado del CFDI del SAT** (Anexo 20, CFDI 4.0, revisión marzo-2023) — confirmó los nombres exactos de nodo/atributo que usa `cfdiBuilder.js` (`Comprobante`, `Emisor`, `Receptor` con `DomicilioFiscalReceptor`/`RegimenFiscalReceptor`, `Conceptos`/`Concepto`, `Impuestos`/`Traslados`/`Traslado`). Nota: la guía revisada es específicamente la del **"CFDI Global"** (ventas a público en general, receptor genérico `XAXX010101000`) — METRYCO no usa esa modalidad (factura a clientes identificados con RFC real), pero los campos base del comprobante son los mismos en cualquier CFDI 4.0 de Ingreso.
- **Certificados de prueba oficiales del SAT** (CSD/FIEL de prueba para desarrollo, incluyendo el RFC de pruebas del gremio `EKU9003173C9`) — disponibles para pruebas de sandbox cuando se conecte un PAC; son públicos, no son datos fiscales reales de ningún cliente de METRYCO.

## 8. Comparación de proveedores (Fase 3 — investigado en documentación oficial, no supuesto)

| | **Facturama** | **SW Sapien (SmarterWeb)** | **Finkok** |
|---|---|---|---|
| Protocolo | REST (JSON) | REST (JSON) | **SOAP** (WSDL) |
| SDK oficial | PHP, .NET, Java, Node.js, JavaScript, Python, Ruby | PHP, Java, Python, .NET (SDKs propios en GitHub `lunasoft/sw-sdk-*`) | No vi SDK Node.js oficial — hay que consumir el WSDL directo (con `soap`/`strong-soap` npm) |
| Sandbox | Sí — `apisandbox.facturama.mx`, 15 timbrados de prueba gratis en 30 días | Sí — endpoints `*.test.sw.com.mx` separados de producción | Sí — endpoints `demo-facturacion.finkok.com`, distintos de producción |
| Autenticación | HTTP Basic | Usuario/contraseña → token temporal (2h) vía `/security/authenticate`; existe opción de token "infinito" | Usuario/contraseña por sesión SOAP |
| Timbrado | Envía datos en JSON, el PAC arma y timbra el CFDI | Recibe el **XML ya armado** (`Sello`/`Certificado`/`NoCertificado` van vacíos, el PAC completa) | Recibe XML |
| Cancelación | Vía API REST | Vía API REST | Servicio SOAP dedicado; el sandbox exige **esperar 2-5 min** después de timbrar antes de poder cancelar |
| Descarga XML/PDF | Sí, vía API | Sí, vía API | Sí, vía servicios de consulta |
| Costos publicados | Sí (planes visibles en su sitio) | No confirmado en esta revisión | No confirmado en esta revisión |
| Complejidad de integración estimada | **Baja** — REST+JSON+Basic Auth es lo más simple de mapear a `PacProvider` | **Media** — hay que armar/firmar el XML CFDI nosotros antes de enviarlo (Facturama y Finkok reciben más resuelto) | **Media-alta** — SOAP en Node.js siempre añade fricción (parseo de WSDL, sin SDK Node oficial encontrado) |

**Recomendación (sujeta a que confirmen costo/soporte, que no verifiqué a fondo): Facturama.** Es el único de los tres con SDK Node.js oficial documentado, protocolo REST/JSON (encaja directo con el resto del stack, que ya es Express+JSON en todos lados) y un flujo de sandbox con límite de pruebas explícito y fácil de arrancar. SW Sapien es buena alternativa si el costo de Facturama no conviene, pero exige generar/firmar el XML del lado de METRYCO antes de mandarlo — más trabajo de "cfdiBuilder" (armar el XML CFDI 4.0 con namespaces, sellar, etc.) que con Facturama. Finkok lo dejaría al final por el protocolo SOAP, más costoso de integrar en un stack 100% Node/Express sin SDK oficial.

**No se verificaron aquí**: precios exactos de SW Sapien/Finkok, límites de timbrados en cada sandbox más allá de lo citado de Facturama, ni si alguno exige el CSD subido a su plataforma vs. firmarlo nosotros — eso depende de la modalidad de cada plan y hay que confirmarlo directo con el proveedor elegido antes de contratar.

Sources:
- [API REST Facturación Electrónica CFDI 4.0 — Facturama](https://apisandbox.facturama.mx/)
- [Documentación API REST de Facturación 4.0 — Facturama](https://apisandbox.facturama.mx/Docs)
- [SW API's — Timbrado Masivo CFDI](https://developers.sw.com.mx/article-categories/apis/)
- [Emisión Timbrado — SW Sapien](https://developers.sw.com.mx/knowledge-base/emision-timbrado-cfdi/)
- [SW SDK Node/PHP/Java/Python — GitHub lunasoft](https://github.com/lunasoft/sw-sdk-php)
- [Finkok — Listado de Servicios](https://github.com/phpcfdi/finkok/blob/main/docs/ListadoDeServicios.md)
- [Finkok — Cancelación](https://wiki.finkok.com/home/webservices/ws_cancelacion)

## 9. Pruebas de integración con PAC falso (`scripts/testCfdiPacIntegracion.js`)

Este script queda **permanente en el repo** (a diferencia de los scripts de verificación puntual que se borran al terminar) porque es la suite de pruebas de integración del módulo. Se corre con:

```bash
cd metryco-backend
node scripts/testCfdiPacIntegracion.js
```

Sustituye `pacFactory.obtenerPac` en memoria por un `FakePacProvider` (extiende `PacProvider`) durante la ejecución del script — **nunca toca `.env`, nunca usa credenciales ni CSD real, no genera un XML/UUID válido ante el SAT**. Solo prueba el contrato interno de `cfdi.service.js`. Casos cubiertos:

1. PAC no configurado → `PAC_NOT_CONFIGURED`.
2. Error de autenticación del PAC (no reintentable) → se propaga, estado pasa a `error_timbrado`.
3. Error de validación del PAC (RFC no coincide) → se propaga, no reintenta.
4. Timeout que se recupera al reintentar una vez → termina `timbrada`, con exactamente 2 llamadas al adaptador.
5. Timeout persistente → falla tras el único reintento, **no entra en bucle**.
6. Respuesta "exitosa" del adaptador sin `uuid`/`xml` → se rechaza, **no se marca timbrada** (hallazgo real de esta fase, corregido).
7. Dos timbrados en paralelo del mismo borrador (`Promise.allSettled`) → solo uno gana, el otro recibe 409.
8. Re-timbrar algo ya timbrado → rechazado.
9. Cancelación → estado `cancelada`.
10. Consulta de estatus → responde `Vigente`.

Última corrida: **10/10 OK**. Los comprobantes de prueba se crean y se borran en la misma ejecución; la configuración fiscal del laboratorio se restaura a su valor original al final.

## 10. Seguridad — revisado

- **Variables de entorno**: `PAC_PROVIDER`/`PAC_API_KEY`/`PAC_API_SECRET`/`PAC_BASE_URL`/`PAC_SANDBOX` solo se leen server-side (`pac.config.js`); ningún endpoint las devuelve al frontend. `.env.example` las documenta sin valores reales.
- **CSD / llaves privadas**: el sistema **no tiene ningún campo para subir `.cer`/`.key`** — a propósito. Según el PAC elegido, el CSD se sube directo a la plataforma del PAC (no a METRYCO) o se maneja de otra forma — se decide al elegir proveedor, ver §8.
- **Logs**: `errorHandler.js` hace `console.error(err)` solo para errores 500 no controlados; los errores de PAC (`PacError`/`PacNotConfiguredError`) son `AppError` con `statusCode` propio y nunca caen en esa rama, así que no se vuelcan a consola en texto plano por default — pero si en el futuro se activa un log persistente, revisar que no se registre el `xml` completo (puede contener datos fiscales del cliente) sin necesidad.
- **XML/PDF**: hoy el XML se guarda como texto dentro del propio documento Mongo (`ComprobanteFiscal.xml`) — no como archivo suelto en disco, así que hereda los permisos/backups de la base de datos, no de `uploads/`. El PDF nunca se guarda localmente, se pide al PAC cada vez (`obtenerPdf`).
- **Autenticación y permisos**: confirmado en la revisión de la Fase 2 — se mantiene igual (lectura abierta a cualquier autenticado, escritura/timbrado/cancelación restringidos a `admin`/`coordinador`).
- **Nada en Git**: no se agregó ningún archivo con secretos; `.env.example` solo tiene nombres de variable.

## 11. Cómo conectar un PAC real (lo único que falta)

1. Contratar un PAC (Facturama, SW Sapien, Finkok, u otro) y obtener credenciales de **sandbox**.
2. Configurar en `.env`: `PAC_PROVIDER`, `PAC_API_KEY`, `PAC_API_SECRET` (si aplica), `PAC_BASE_URL`, `PAC_SANDBOX=true`.
3. Crear `services/pac/providers/<nombre>.js` que extienda `PacProvider` e implemente `timbrarFactura`, `cancelarFactura`, `consultarFactura`, `obtenerXml`, `obtenerPdf` usando el SDK/API real del proveedor. Todo error real debe lanzarse como `PacError` (marcando `retryable: true` solo si es de red/timeout).
4. Registrar el adaptador en `pacFactory.js` (línea comentada de ejemplo ya está ahí).
5. **Si el PAC recibe JSON** (Facturama): mapear el snapshot de `ComprobanteFiscal` (emisor/receptor/conceptos/totales) al formato que pida su API — transformación directa, `cfdiBuilder.js` no hace falta para esta ruta (aunque su `validarComprobante` igual sirve como chequeo previo).
   **Si el PAC recibe XML ya armado** (SW Sapien, y probablemente Finkok): **ya existe** `services/cfdiBuilder.js` — genera el XML CFDI 4.0 completo (namespaces, `Comprobante`/`Emisor`/`Receptor`/`Conceptos`/`Impuestos`, impuestos agrupados por Impuesto+TipoFactor+TasaOCuota como exige el SAT en el nodo resumen) a partir del mismo snapshot, sin `Sello`/`Certificado`/`NoCertificado` (eso lo completa el PAC con el CSD). `cfdi.service.timbrar()` ya lo llama automáticamente y lo manda como `payload.xmlSinTimbrar` a `pac.timbrarFactura()` — el adaptador de un PAC que reciba XML solo tiene que tomar ese campo tal cual.
6. Correr `scripts/testCfdiPacIntegracion.js` sustituyendo el fake por el adaptador real apuntando a sandbox, para confirmar que el contrato de errores/reintentos sigue sano contra la API real.
7. Probar timbrando en modo sandbox antes de pasar a producción (`PAC_SANDBOX=false`).

Nada de esto requiere volver a tocar `cfdi.service.js`, el controller, las rutas ni el frontend — todos ya hablan con la interfaz `PacProvider`, no con un proveedor específico.

## 12. Pendientes conocidos

- Sin PAC conectado, el flujo termina en "borrador" — no hay CFDI real todavía.
- No hay endpoint de `DELETE` para borradores (se puede agregar si hace falta limpiar borradores de prueba).
- El PDF fiscal lo debe devolver el PAC (`pac.obtenerPdf`) — este sistema no genera un PDF propio con diseño de factura; si se quiere un PDF con la plantilla visual de METRYCO además del XML/PDF oficial del PAC, es trabajo adicional de diseño (no técnico-fiscal).
- `cfdiBuilder.js` genera CFDI de tipo Ingreso ("I") con solo impuesto trasladado IVA (002) — no contempla IEPS, retenciones, ni Complementos (pago, nómina, carta porte...); si algún cliente necesita eso, hay que extenderlo.
- Los estados `pendiente_timbrar` y `cancelacion_pendiente` existen en el modelo (reservados para flujos asíncronos que algunos PAC usan) pero **ningún código los asigna todavía** — hoy el timbrado/cancelación de este sistema es síncrono. Revisar si el PAC elegido responde de forma asíncrona (webhook/polling) antes de asumir que no hacen falta.
- Concurrencia probada con un caso real (`Promise.allSettled`, dos timbrados en paralelo), no con carga real (decenas de requests simultáneas) — suficiente para el volumen esperado de un laboratorio, no para un escenario de facturación masiva.

## 13. Qué necesita el negocio para avanzar

- Elegir el PAC (recomendación técnica: Facturama — ver §8; confirmar costo/soporte antes de decidir).
- Cuenta con ambiente sandbox de ese PAC.
- Confirmar el régimen fiscal y CP fiscal reales del laboratorio (se capturan en Administración, no en código).
- Decidir si van a timbrar con el CSD (certificado de sello digital) propio del laboratorio subido al PAC, o si el PAC lo maneja de otra forma — varía por proveedor, hay que revisar su documentación al elegir uno.

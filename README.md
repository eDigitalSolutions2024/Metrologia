# METRYCO — Sistema de gestión para laboratorio de metrología

Aplicación web para operar un laboratorio de metrología de punta a punta: desde que se **cotiza** un servicio hasta que se **emite el certificado de calibración**, se **factura** ante el SAT (CFDI 4.0) y se **cobra**.

> Internamente el sistema se llama **METRYCO**; en pantalla y en los documentos que ve el cliente aparece el nombre del laboratorio configurado en *Administración*.

---

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Especificaciones y herramientas](#2-especificaciones-y-herramientas)
3. [Requisitos previos (con enlaces de descarga)](#3-requisitos-previos-con-enlaces-de-descarga)
4. [Levantar el sistema en local, paso a paso](#4-levantar-el-sistema-en-local-paso-a-paso)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Integraciones opcionales](#6-integraciones-opcionales)
7. [Roles y permisos](#7-roles-y-permisos)
8. [Estructura del repositorio](#8-estructura-del-repositorio)
9. [Comandos útiles](#9-comandos-útiles)
10. [Solución de problemas](#10-solución-de-problemas)
11. [Documentación adicional y seguridad](#11-documentación-adicional-y-seguridad)

---

## 1. Qué hace

| Módulo | Para qué sirve |
|---|---|
| **Clientes** | Alta de clientes con contactos, datos fiscales (RFC, régimen, CP, uso de CFDI), días de crédito y ficha con todo su historial (cotizaciones, reportes, equipos, certificados, facturas y saldo). |
| **Cotizaciones** | Cotizaciones con partidas ligadas a equipos del cliente, claves SAT, adjuntos, aprobación y duplicado. Desde una aprobada se crea el reporte o se factura (incluso por partes). |
| **Reportes de servicio** | Orden de trabajo del laboratorio: recepción y recolección de equipos, asignación de técnicos y patrones, seguimiento y entrega. |
| **Calibración e incertidumbre** | Captura de puntos y cálculo de incertidumbre de medición (método GUM), plantillas por magnitud e importación asistida desde Word/Excel. |
| **Equipos y Patrones** | Inventario de equipos por cliente y de patrones de referencia, con vigencia de calibración, etiquetas con QR e historial de certificados. |
| **Calidad** | Cola de revisión: Calidad aprueba o rechaza el certificado antes de emitirlo. |
| **Certificados** | Emisión de certificados en PDF con sello QR y **verificación pública** por enlace; vigencias, anulación y recordatorios de vencimiento por **WhatsApp**. |
| **Facturación (CFDI 4.0)** | Facturas de ingreso, **Complemento de Pago** y cancelación, con timbrado real mediante un PAC (**Dinvbox**); PDF y XML. |
| **Cuentas por cobrar** | Control de cobro con abonos parciales, vencimientos, calendario de pagos y exportación a Excel. Se conecta solo con la facturación. |
| **Alertas** | Popup por rol con pendientes (cotizaciones sin seguimiento, certificados por vencer, facturas atrasadas, errores de timbrado…), casi en tiempo real. |
| **Administración** | Datos y logotipo del laboratorio, colores, razones sociales, roles del menú, usuarios, auditoría de acciones sensibles y seguridad de cuentas. |

Además: menú y rutas protegidos por rol, refresco automático de las tablas cada 20 s, tablas con filas clicables y perfil de usuario (contraseña, foto y firma digital).

---

## 2. Especificaciones y herramientas

**Arquitectura:** aplicación de dos partes (API REST + interfaz web) que se comunican por HTTP/JSON con sesión por *cookies* y tokens JWT.

| Parte | Carpeta | Puerto local | Tecnologías principales |
|---|---|---|---|
| **Backend (API)** | `metryco-backend` | `4000` | [Node.js](https://nodejs.org/) · [Express 4](https://expressjs.com/) · [MongoDB](https://www.mongodb.com/) con [Mongoose 8](https://mongoosejs.com/) · [Zod](https://zod.dev/) (validación) · [JWT](https://github.com/auth0/node-jsonwebtoken) · [Helmet](https://helmetjs.github.io/) y [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) (seguridad) |
| **Frontend (web)** | `metryco-laboratorio` | `5174` | [React 19](https://react.dev/) · [Vite](https://vite.dev/) · [Material UI (MUI)](https://mui.com/) · [React Router](https://reactrouter.com/) · [React Hook Form](https://react-hook-form.com/) · [Axios](https://axios-http.com/) |

**Librerías del backend por función:**

| Función | Librería |
|---|---|
| PDF de facturas y documentos | [pdfkit](https://pdfkit.org/) |
| PDF de certificados (HTML → PDF) | [Puppeteer](https://pptr.dev/) (descarga su propio Chromium) |
| Excel y CSV | [exceljs](https://github.com/exceljs/exceljs), [csv-parse](https://csv.js.org/parse/) |
| Lectura de Word/PDF | [mammoth](https://github.com/mwilliamson/mammoth.js), [pdf-parse](https://gitlab.com/autokent/pdf-parse) |
| Códigos QR | [qrcode](https://github.com/soldair/node-qrcode) |
| Tareas programadas | [node-cron](https://github.com/node-cron/node-cron) |
| Firma y cadena original del CFDI | [@nodecfdi/credentials](https://github.com/nodecfdi/credentials), [@cfdi/transform](https://www.npmjs.com/package/@cfdi/transform) |
| Timbrado (servicio SOAP del PAC) | [soap](https://github.com/vpulim/node-soap) |
| Contraseñas y subida de archivos | [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [multer](https://github.com/expressjs/multer) |

**Versiones de referencia:** Node.js ≥ 22.12 (desarrollado con la v24), npm ≥ 10, MongoDB 7 o superior.

---

## 3. Requisitos previos (con enlaces de descarga)

### Obligatorios

| Requisito | Versión | Para qué | Descarga |
|---|---|---|---|
| **Node.js** (incluye npm) | **22.12 o superior** (recomendado: LTS actual) | Ejecutar backend y frontend | <https://nodejs.org/en/download> |
| **MongoDB Community Server** | 7.0 o superior | Base de datos | <https://www.mongodb.com/try/download/community> |
| **Git** | cualquiera reciente | Clonar el repositorio | <https://git-scm.com/downloads> |

> **¿No quieres instalar MongoDB?** Alternativas: una base gratuita en la nube con [MongoDB Atlas](https://www.mongodb.com/atlas) (copia su cadena de conexión en `MONGODB_URI`), o correrlo en contenedor con [Docker Desktop](https://www.docker.com/products/docker-desktop/) (`docker run -d -p 27017:27017 --name mongo mongo:7`).

### Recomendados (opcionales)

| Herramienta | Para qué | Descarga |
|---|---|---|
| **MongoDB Compass** | Ver y editar los datos con interfaz gráfica | <https://www.mongodb.com/try/download/compass> |
| **Visual Studio Code** | Editor de código | <https://code.visualstudio.com/> |
| **Un navegador moderno** (Chrome, Edge o Firefox) | Usar el sistema | <https://www.google.com/chrome/> |

### Solo si vas a usar las integraciones (ver [sección 6](#6-integraciones-opcionales))

| Integración | Qué necesitas | Enlace |
|---|---|---|
| Timbrado de facturas (CFDI) | Cuenta con el PAC **Dinvbox** y un CSD (certificado de sello digital) | <https://dinvbox.mx/> · documentación: <https://developers.dinvbox.mx/> |
| Certificados de prueba del SAT | Para probar el timbrado sin datos reales | <https://www.sat.gob.mx/> (búsqueda: "certificados de prueba") |
| WhatsApp (recordatorios) | Cuenta de Meta for Developers con WhatsApp Business (Cloud API) | <https://developers.facebook.com/docs/whatsapp/cloud-api> |
| Asistente de incertidumbre con IA | Llave de API de Anthropic | <https://console.anthropic.com/> |

**Comprobar la instalación** (en una terminal):

```bash
node --version     # debe mostrar v22.12 o mayor
npm --version
git --version
mongod --version   # si instalaste MongoDB localmente
```

---

## 4. Levantar el sistema en local, paso a paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/jose-esquivel-dev/Metryco_Dev.git
cd Metryco_Dev
```

> También existe el espejo `https://github.com/eDigitalSolutions2024/Metrologia.git` (mismo contenido).

### Paso 2 — Tener MongoDB corriendo

- **Windows:** al instalar MongoDB Community con el asistente, déjalo como **servicio** (opción por defecto); queda corriendo solo en `mongodb://127.0.0.1:27017`. Si no, ejecuta `mongod` en una terminal aparte.
- **macOS / Linux:** sigue la guía oficial para iniciar el servicio: <https://www.mongodb.com/docs/manual/installation/>.
- **Docker:** `docker run -d -p 27017:27017 --name mongo mongo:7`.

### Paso 3 — Configurar y arrancar el backend

```bash
cd metryco-backend
npm install
```

> La primera instalación descarga Chromium para generar PDF de certificados (puede pesar varios cientos de MB y tardar unos minutos).

Crea tu archivo de configuración a partir del ejemplo:

```bash
# macOS / Linux / Git Bash
cp .env.example .env
# Windows (PowerShell)
copy .env.example .env
```

Abre `.env` y revisa como mínimo:

| Variable | Qué poner |
|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/metryco` (o tu cadena de Atlas) |
| `JWT_SECRET` y `JWT_REFRESH_SECRET` | Dos cadenas largas y distintas (ver abajo cómo generarlas) |
| `CORS_ORIGIN` | `http://localhost:5174` |
| `SEED_ADMIN_USUARIO`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` | Datos del primer administrador |

Generar un secreto aleatorio (ejecútalo dos veces, una por cada variable):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crea el primer usuario administrador y, si quieres datos de ejemplo, carga la demostración:

```bash
npm run seed:admin       # crea el usuario administrador definido en .env
npm run seed:completo    # OPCIONAL: catálogos + datos de demostración en todos los módulos
```

> `seed:completo` requiere que ya exista el administrador (por eso va después de `seed:admin`) y se puede repetir sin duplicar datos. Los usuarios de demostración que crea usan la contraseña `Demo2026!`. **Solo para desarrollo.**

Arranca la API:

```bash
npm run dev
```

Debe imprimir: `API de Metrología corriendo en http://localhost:4000`. Déjala corriendo.

### Paso 4 — Configurar y arrancar el frontend

En **otra terminal**, desde la carpeta raíz del repositorio:

```bash
cd metryco-laboratorio
npm install

# macOS / Linux / Git Bash
cp .env.example .env
# Windows (PowerShell)
copy .env.example .env

npm run dev
```

El `.env` del frontend solo necesita `VITE_API_URL=http://localhost:4000/api` (ya viene así en el ejemplo).

### Paso 5 — Abrir el sistema

Entra a **<http://localhost:5174>** e inicia sesión con el usuario y contraseña que pusiste en `SEED_ADMIN_USUARIO` / `SEED_ADMIN_PASSWORD`. Cambia esa contraseña desde el perfil (engrane de la barra superior).

### Primer arranque: configuración recomendada

1. **Administración → Datos del laboratorio:** nombre, acreditación, domicilio, y (si vas a facturar) RFC, régimen fiscal y código postal fiscal.
2. **Administración → Logotipos y colores:** logotipo y colores del laboratorio.
3. **Usuarios:** da de alta a tu equipo (coordinador, ventas, técnicos).
4. **Clientes:** al menos uno con sus datos fiscales completos (la columna *Fiscal* indica si está "Listo").

---

## 5. Variables de entorno

### Backend — `metryco-backend/.env` (plantilla: `.env.example`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGODB_URI` | Sí | Cadena de conexión a MongoDB. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Sí | Secretos de los tokens de sesión. En producción no se acepta el valor de ejemplo. |
| `PORT` | No | Puerto de la API (por defecto `4000`). |
| `NODE_ENV` | No | `development` (por defecto) o `production`. |
| `CORS_ORIGIN` | En producción | Origen del frontend. En local: `http://localhost:5174`. |
| `PUBLIC_WEB_URL` | No | URL pública que va en el QR de los certificados (por defecto toma `CORS_ORIGIN`). |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | No | Duración de los tokens (`1h` y `7d` por defecto). |
| `SEED_ADMIN_*` | Para `seed:admin` | Usuario, contraseña, nombre y correo del primer administrador. |
| `ANTHROPIC_API_KEY`, `ASISTENTE_MODEL` | No | Activan el asistente de incertidumbre con IA. |
| `PAC_*` | Para facturar | Proveedor de timbrado y CSD (ver sección 6). |
| `WHATSAPP_*` | Para WhatsApp | Credenciales de la API de WhatsApp Business (ver sección 6). |

### Frontend — `metryco-laboratorio/.env`

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL de la API. En local: `http://localhost:4000/api`. |

> **Nunca subas `.env` a git** (ya está en `.gitignore`). Contienen secretos.

---

## 6. Integraciones opcionales

El sistema funciona completo sin estas integraciones; cada una solo activa una función extra.

### Asistente de incertidumbre con IA
Define `ANTHROPIC_API_KEY` (llave en <https://console.anthropic.com/>). Sin ella, el sistema trabaja en "modo sin IA" (heurística local).

### Facturación electrónica (CFDI 4.0) con Dinvbox
Sin configurar, todo el módulo de Facturación funciona **excepto timbrar y cancelar**.

Para probar contra el **sandbox** de Dinvbox:

```env
PAC_PROVIDER=dinvbox
PAC_API_KEY=<usuario de pruebas>
PAC_API_SECRET=<contraseña de pruebas>
PAC_BASE_URL=https://wsdemo.dinvbox.mx/timbrado/soap
PAC_CSD_CER=csd/<archivo>.cer
PAC_CSD_KEY=csd/<archivo>.key
PAC_CSD_PASSWORD=<contraseña del CSD>
```

Notas importantes:
- Coloca los archivos del CSD en `metryco-backend/csd/` (carpeta ignorada por git). Para pruebas sirven los certificados públicos de prueba del SAT; en la carpeta `Facturacion/` del repositorio hay un conjunto de ellos.
- En el sandbox, el **RFC y la razón social del laboratorio** (Administración → Datos del laboratorio) y los del cliente deben coincidir **exactamente** con los registrados en el SAT para ese RFC de prueba.
- Para **producción**: contrato con el PAC, credenciales y URL de producción, y el **CSD real** del laboratorio. Detalle técnico en [`docs/FACTURACION.md`](docs/FACTURACION.md).

### Recordatorios por WhatsApp (certificados por vencer)
Requiere una app de Meta con WhatsApp Business y una plantilla aprobada. Variables: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` (token permanente de un *System User*), `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_RECORDATORIO`. Guía: <https://developers.facebook.com/docs/whatsapp/cloud-api>. Hay un panel de pruebas en *Administración → WhatsApp (pruebas)*.

---

## 7. Roles y permisos

| Rol | Puede |
|---|---|
| **admin** | Todo, incluida la administración del sistema, usuarios, auditoría y roles del menú. |
| **coordinador** | Operación completa (clientes, cotizaciones, reportes, calidad, certificados, facturación, cobranza). |
| **ventas** | Clientes, cotizaciones y reportes; consulta de cobranza. No ve administración ni calidad. |
| **tecnico** | Sus asignaciones: captura de calibración, recolección y entrega. No ve clientes, facturación ni montos de deuda. |

El menú y las rutas se protegen por rol (configurable en *Administración → Roles del menú*), y el backend valida los permisos en cada endpoint.

---

## 8. Estructura del repositorio

```
.
├── metryco-backend/            API (Node + Express + MongoDB)
│   ├── src/
│   │   ├── models/             Esquemas de MongoDB (Mongoose)
│   │   ├── routes/             Rutas de la API por módulo
│   │   ├── controllers/        Capa HTTP
│   │   ├── services/           Lógica de negocio (facturación, cobranza, certificados…)
│   │   ├── schemas/            Validaciones (Zod)
│   │   ├── middleware/         Autenticación, roles, auditoría, validación
│   │   ├── jobs/               Tareas programadas (recordatorios de WhatsApp)
│   │   └── assets/sat-xslt/    Hojas XSLT oficiales del SAT (cadena original del CFDI)
│   ├── scripts/                Seeds de datos y pruebas de integración
│   └── csd/                    (local, ignorada por git) certificados de sello digital
├── metryco-laboratorio/        Interfaz web (React + Vite + MUI)
│   └── src/
│       ├── pages/              Una carpeta por módulo (Clientes, Cotizaciones, Facturacion…)
│       ├── components/         Navbar, Sidebar, alertas
│       ├── shared/             Componentes y utilidades compartidas (AppTable, hooks…)
│       ├── services/           Llamadas a la API
│       └── routes/             Rutas y protección por rol
├── docs/                       Documentación técnica (FACTURACION.md, manuales)
├── PDFs/                       Guías y resúmenes de cambios en PDF
└── Facturacion/                Certificados públicos de prueba del SAT y material de apoyo
```

---

## 9. Comandos útiles

**Backend** (`metryco-backend`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | API con reinicio automático al guardar (nodemon). |
| `npm start` | API en modo normal (producción). |
| `npm run seed:admin` | Crea el primer usuario administrador. |
| `npm run seed:metrologia` | Catálogos base de metrología. |
| `npm run seed:demo` | Datos de demostración básicos. |
| `npm run seed:completo` | Demostración completa de todos los módulos (idempotente). |

**Frontend** (`metryco-laboratorio`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en <http://localhost:5174>. |
| `npm run build` | Compila para producción (carpeta `dist/`). |
| `npm run preview` | Sirve la compilación para revisarla. |
| `npm run lint` | Revisa el código con ESLint. |

---

## 10. Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| `Faltan variables de entorno requeridas` al iniciar la API | No existe `.env` o le faltan `MONGODB_URI`, `JWT_SECRET` o `JWT_REFRESH_SECRET`. Copia `.env.example` y complétalo. |
| `No se pudo iniciar el servidor: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB no está corriendo. Inicia el servicio (paso 2). |
| El frontend abre pero el login falla o dice error de red | La API no está arrancada, o `VITE_API_URL` no apunta a ella. Revisa que la terminal del backend siga activa en el puerto 4000. |
| Error de CORS en el navegador | `CORS_ORIGIN` del backend debe ser `http://localhost:5174`. Reinicia la API tras cambiarlo. |
| `Port 5174 is already in use` | Otro proceso usa el puerto (el frontend exige ese puerto). Cierra la otra instancia de Vite. |
| `EADDRINUSE :::4000` | Ya hay una API corriendo en ese puerto; ciérrala o cambia `PORT`. |
| `npm install` falla en Puppeteer / tarda mucho | Está descargando Chromium. Revisa tu conexión o proxy; debe completarse una sola vez. |
| `Unsupported engine` o errores raros al instalar | Tu Node es anterior a 22.12. Actualiza a la versión LTS actual. |
| No puedo timbrar: `PAC_NOT_CONFIGURED` | Faltan las variables `PAC_*` (sección 6). El resto del sistema funciona sin ellas. |
| Dinvbox rechaza por RFC o nombre (`CFDI40139`, `CFDI40145`…) | En el sandbox el nombre y RFC deben coincidir exactamente con el padrón del SAT para ese RFC de prueba. |
| Los QR de certificados apuntan a otro puerto | Ajusta `PUBLIC_WEB_URL` (o `CORS_ORIGIN`) a `http://localhost:5174`. |

Para empezar de cero con la base de datos: borra la base `metryco` desde MongoDB Compass (o `mongosh` → `use metryco` → `db.dropDatabase()`) y vuelve a correr los seeds.

---

## 11. Documentación adicional y seguridad

- [`PDFs/Guia-Timbrado-Facturas-CFDI.pdf`](PDFs/Guia-Timbrado-Facturas-CFDI.pdf): **guía para el personal** sobre qué debe estar listo y cómo capturar los datos para que el timbrado funcione y llegue al SAT (también se abre desde Facturación → *Guía de timbrado*).
- [`docs/FACTURACION.md`](docs/FACTURACION.md): arquitectura, reglas del SAT, proveedores de timbrado y cómo conectar un PAC real.
- [`PDFs/`](PDFs/): guías "Cómo funciona…" por módulo y resúmenes de cambios.
- [`docs/modelo-datos.html`](docs/modelo-datos.html): modelo de datos.

**Seguridad:**
- Nunca subas a git archivos `.env`, ni `.key` / `.cer` **reales** (el CSD del laboratorio). Las carpetas `csd/` y las extensiones `.key` / `.cer` del backend están excluidas por `.gitignore`.
- Cambia todas las contraseñas y secretos de ejemplo antes de desplegar; en producción la API se niega a arrancar con los secretos de `.env.example`.
- Las contraseñas de los usuarios de demostración (`Demo2026!`) son solo para desarrollo.

---

*Proyecto de uso interno. Licencia: sin licencia pública (uso privado).*

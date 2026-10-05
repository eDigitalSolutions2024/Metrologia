# metryco-api

Backend de Metryco Laboratorio — Express + MongoDB + Mongoose.

Consumido por el frontend `metryco-laboratorio` (React + Vite).

## Arranque

```bash
npm install
cp .env.example .env   # y edita los valores, especialmente JWT_SECRET/JWT_REFRESH_SECRET
npm run seed:admin     # crea el primer usuario admin usando SEED_ADMIN_* del .env
npm run dev
```

Requiere una instancia de MongoDB accesible en `MONGODB_URI` (local o Atlas).

## Estructura

```
src/
  config/      conexión a Mongo, validación de variables de entorno
  models/      schemas de Mongoose
  services/    lógica de negocio (lo único que le habla a los models)
  controllers/ traducen request/response, sin lógica de negocio
  routes/      mapean verbo+URL a un controller
  middleware/  auth (JWT), requireRole, manejo de errores
  app.js       configuración de Express
  server.js    punto de entrada (conecta Mongo y levanta el servidor)
scripts/
  seedAdmin.js crea el primer usuario admin
```

## Estado (2026-08-21)

Módulos implementados: **Auth** (login/refresh/logout con JWT + refresh token en cookie httpOnly) y **Usuarios**/**Clientes** (CRUD completo). El resto de los módulos (Cotizaciones, Reportes, Calidad, Equipos, Patrones, Actividades, Cobranza, Técnicos/Asignaciones) se agregan uno por uno siguiendo el mismo patrón — ver la auditoría del proyecto para el orden y las reglas de negocio de cada uno.

Fuera de alcance por ahora: Facturación Electrónica (CFDI/SAT, se mantiene en el sistema PHP actual), Almacén, Proveedores/Compras y Plan de Producción (no confirmados en uso operativo).

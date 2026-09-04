const { Schema, model } = require("mongoose");

/**
 * Configuración global del sistema — documento único (`clave: "global"`).
 * Empieza solo con `menuPermisos` (qué roles ven cada ítem del menú lateral,
 * antes fijo en el código en components/Sidebar/menuConfig.js). Pensado para
 * crecer: nombre de la empresa, colores de la interfaz, logotipos, etc.
 */
const configuracionSchema = new Schema(
  {
    clave: { type: String, required: true, unique: true, default: "global" },
    // Map de key de ítem de menú -> arreglo de roles que lo pueden ver.
    // La key es `item.path` para hojas, o el título del grupo para los
    // encabezados sin ruta propia (ej. "Reportes", "Equipos").
    menuPermisos: { type: Map, of: [String], default: undefined },

    // Datos del laboratorio para los PDFs (Reportes/Certificados) y la
    // verificación pública — antes fijos en variables de entorno (LAB_*),
    // ahora editables desde Administración sin tocar el .env ni reiniciar.
    laboratorio: {
      nombre: String,
      acreditacion: String,
      rfc: String,
      domicilio: String,
      telefono: String,
    },

    // Logo de la empresa — reemplaza el ícono genérico (BrandMark SVG) en
    // sidebar, login y encabezado de PDFs cuando se sube uno.
    logo: {
      nombreArchivo: String, // nombre en disco (uploads/logos/<esto>)
      nombreOriginal: String,
      mimetype: String,
      tamano: Number,
      fecha: Date,
    },

    // Colores de marca de la interfaz — antes fijos en theme/theme.js.
    // primario = tono oscuro (sidebar, botones principales); secundario =
    // acento (botones de acción, enlaces, focos). Se aplican en vivo vía
    // ThemeProvider, sin rebuild.
    colores: {
      primario: String,
      secundario: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Configuracion", configuracionSchema);

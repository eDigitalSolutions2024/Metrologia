export const required = (label = "Este campo") => ({
  required: `${label} es obligatorio`,
});

export const emailRules = {
  required: "El correo es obligatorio",
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Correo inválido",
  },
};

export const rfcRules = {
  required: "El RFC es obligatorio",
  pattern: {
    value: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
    message: "RFC inválido",
  },
};

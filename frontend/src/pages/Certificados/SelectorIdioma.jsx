import { useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";

/** Idioma del certificado al imprimir: se recuerda la última elección en este navegador. */
export function useIdiomaCertificado() {
  const [idioma, setIdioma] = useState(() => {
    try { return localStorage.getItem("idiomaCertificado") === "en" ? "en" : "es"; } catch { return "es"; }
  });
  const cambiar = (nuevo) => {
    setIdioma(nuevo);
    try { localStorage.setItem("idiomaCertificado", nuevo); } catch { /* sin storage */ }
  };
  return [idioma, cambiar];
}

const estiloBoton = {
  px: 1.75, textTransform: "none", fontWeight: 700, color: "#334155", borderColor: "#94a3b8", bgcolor: "#fff",
  "&:hover": { bgcolor: "#e2e8f0" },
  "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "#10265c", color: "#fff" },
};

export default function SelectorIdioma({ idioma, onChange }) {
  return (
    <ToggleButtonGroup
      size="small" exclusive value={idioma}
      onChange={(_, v) => v && onChange(v)}
      aria-label="Idioma del certificado"
    >
      <ToggleButton value="es" type="button" sx={estiloBoton}>
        <TranslateOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> Español
      </ToggleButton>
      <ToggleButton value="en" type="button" sx={estiloBoton}>English</ToggleButton>
    </ToggleButtonGroup>
  );
}

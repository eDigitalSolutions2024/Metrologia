import { TextField } from "@mui/material";

export default function AppInput({ label, error, helperText, type, onClick, slotProps, ...props }) {
  const isDate = type === "date";

  return (
    <TextField
      label={label}
      type={type}
      fullWidth
      size="small"
      error={!!error}
      helperText={error?.message || helperText}
      onClick={isDate ? (e) => { e.target.showPicker?.(); onClick?.(e); } : onClick}
      // Los inputs nativos type="date" siempre muestran su propio formato
      // (dd/mm/aaaa) aunque no tengan valor, así que su label debe quedar
      // arriba desde el inicio o se superpone — eso sí se fuerza siempre.
      // El resto de los campos usa el comportamiento normal de MUI (sube al
      // enfocar o si hay valor); el caller puede forzarlo puntualmente
      // pasando su propio slotProps.inputLabel (ej. un valor autogenerado).
      slotProps={{
        ...slotProps,
        inputLabel: isDate ? { shrink: true, ...slotProps?.inputLabel } : slotProps?.inputLabel,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
        },
        // El autocompletado de Chrome/Edge pinta su propio fondo (claro) sin
        // importar el tema de la app, dejando la etiqueta encogida casi
        // ilegible sobre ese azul/amarillo. Se fuerza a que respete el fondo
        // y el color de texto del tema — el "transition" gigante es el truco
        // estándar para que no vuelva a aplicar su color tras unos segundos.
        "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": (theme) => ({
          WebkitTextFillColor: theme.palette.text.primary,
          WebkitBoxShadow: `0 0 0px 1000px ${theme.palette.background.paper} inset`,
          transition: "background-color 600000s ease-in-out 0s",
        }),
        ...(isDate && {
          "& input[type='date']": { cursor: "pointer" },
          "& input[type='date']::-webkit-calendar-picker-indicator": {
            cursor: "pointer",
            borderRadius: 1,
            padding: "3px",
            transition: "background-color .15s ease",
          },
          "& input[type='date']::-webkit-calendar-picker-indicator:hover": {
            backgroundColor: "action.hover",
          },
        }),
      }}
      {...props}
    />
  );
}

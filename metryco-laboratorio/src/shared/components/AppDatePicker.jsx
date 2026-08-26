import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

/**
 * Date picker con estilo único de la app (mismo radio/tamaño que AppInput),
 * adaptado a tema claro/oscuro vía CSS vars de MUI.
 *
 * value / onChange trabajan con string "YYYY-MM-DD" (o null), para encajar
 * directo con react-hook-form sin convertir dayjs <-> string en cada formulario.
 */
export default function AppDatePicker({ label, value, onChange, error, helperText, ...props }) {
  return (
    <DatePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(nuevo) => onChange?.(nuevo && nuevo.isValid() ? nuevo.format("YYYY-MM-DD") : "")}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          fullWidth: true,
          size: "small",
          error: !!error,
          helperText: error?.message || helperText,
        },
      }}
      sx={{
        width: "100%",
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
        },
      }}
      {...props}
    />
  );
}

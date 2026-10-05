import dayjs from "dayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

/**
 * Time picker con el mismo estilo que AppDatePicker.
 * value / onChange trabajan con string "HH:mm" (o "").
 */
export default function AppTimePicker({ label, value, onChange, error, helperText, ...props }) {
  return (
    <TimePicker
      label={label}
      value={value ? dayjs(value, "HH:mm") : null}
      onChange={(nuevo) => onChange?.(nuevo && nuevo.isValid() ? nuevo.format("HH:mm") : "")}
      ampm={false}
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

import { TextField } from "@mui/material";

export default function AppInput({ label, error, helperText, type, onClick, ...props }) {
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
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
        },
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

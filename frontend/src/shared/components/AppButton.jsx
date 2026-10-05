import { Button, CircularProgress } from "@mui/material";

export default function AppButton({ children, loading = false, variant = "contained", startIcon, ...props }) {
  return (
    <Button
      variant={variant}
      disabled={loading || props.disabled}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      {...props}
    >
      {children}
    </Button>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

import AppThemeProvider from "./theme/AppThemeProvider";
import AuthProvider from "./core/auth/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <AuthProvider>
            <App />
          </AuthProvider>
        </LocalizationProvider>
      </AppThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { applyTheme, useThemeStore } from "./stores/themeStore";
import "./index.css";

// Apply the persisted theme before the first paint.
applyTheme(useThemeStore.getState().theme);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          gutter={10}
          toastOptions={{
            duration: 3800,
            style: {
              background: "#0b1220",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "12px 16px",
              fontSize: "13px",
              maxWidth: "440px",
              boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)",
            },
            success: { iconTheme: { primary: "#34d399", secondary: "#0b1220" } },
            error: { iconTheme: { primary: "#fb7185", secondary: "#0b1220" } },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

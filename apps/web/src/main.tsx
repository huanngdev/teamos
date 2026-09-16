import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App, AppProviders } from "./app";
import { ErrorBoundary } from "./components/error-boundary";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
);

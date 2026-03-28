import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { HashRouter } from "react-router-dom";

import App from "./App";
import "./i18n";
import "./style.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE,
  });
}

const shouldRunSentryTest =
  import.meta.env.VITE_SENTRY_TEST === "1" &&
  new URLSearchParams(window.location.search).get("sentry_test") === "1";
if (shouldRunSentryTest) {
  const error = new Error("GlitchTip test error (frontend)");
  Sentry.captureException(error);
  console.error(error);
}

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

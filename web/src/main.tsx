import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { LinkGateProvider } from "./components/LinkGate";
import { I18nProvider } from "./i18n";
import "flag-icons/css/flag-icons.min.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <LinkGateProvider>
        <App />
      </LinkGateProvider>
    </I18nProvider>
  </StrictMode>,
);

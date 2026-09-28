// Must be first: routes every /api request to the in-browser demo backend.
import "./demo/install";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DemoBadge } from "./demo/DemoBadge";
import "./index.css";

// The production app registers an offline service worker here; the demo
// deliberately doesn't, so visitors always get the latest demo build.

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <DemoBadge />
  </ErrorBoundary>,
);

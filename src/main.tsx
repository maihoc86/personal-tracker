import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { ConfirmProvider } from "./components/ui/confirm-dialog";
import { TooltipProvider } from "./components/ui/tooltip";
import { seedSampleDataIfEmpty } from "./features/workspace/sample-data";
import { SETTINGS_KEY } from "./lib/data-keys";
import { readStorage } from "./lib/persistence";
import { applySettings, normalizeSettings } from "./lib/settings";

// Apply saved theme/accent before first paint to avoid a flash.
applySettings(normalizeSettings(readStorage(SETTINGS_KEY)));

// First-ever visit lands on a populated workspace so the welcome tour has
// content. Stores read storage lazily, so this runs before any of them load.
if (window.localStorage.getItem("pt.welcomed") === null) {
  seedSampleDataIfEmpty();
}

// Enable accent cross-fade only after the first paint.
requestAnimationFrame(() => document.documentElement.classList.add("theme-ready"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300} skipDelayDuration={300}>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </TooltipProvider>
    </MotionConfig>
  </StrictMode>,
);

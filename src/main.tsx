import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register the service worker in `autoUpdate` mode. When a new build is
// deployed, the fresh worker takes control and this reloads the page once so
// the newly hashed JS/HTML replaces whatever was cached. Without this the app
// keeps running the previously cached bundle until a manual hard refresh —
// which is why the tracker/family view showed stale JS.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Installed PWAs rarely do a full navigation, so poll for a new worker
    // hourly and whenever the app regains focus.
    const checkForUpdate = () => registration.update();
    setInterval(checkForUpdate, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});

createRoot(document.getElementById("root")!).render(<App />);

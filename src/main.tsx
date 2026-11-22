import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA (Desktop & Mobile app installation)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("PWA Service Worker registered with scope:", reg.scope);
      })
      .catch((err) => {
        console.error("PWA Service Worker registration failed:", err);
      });
  });
} else if ("serviceWorker" in navigator) {
  // In development, also register so install prompt and tests work
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("PWA Service Worker registered (dev) with scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("PWA Service Worker registration warning:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

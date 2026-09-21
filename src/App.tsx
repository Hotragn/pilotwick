import { getCurrentWindow } from "@tauri-apps/api/window";
import CompanionOverlay from "./companion/CompanionOverlay";
import SettingsWindow from "./settings/SettingsWindow";

/**
 * One React app, two windows, routed by window label (labels are fixed at
 * window creation, so this can never break — unlike URL fragments, which
 * may get percent-encoded when Tauri joins them onto the dev server URL).
 */
export default function App() {
  const isSettings =
    getCurrentWindow().label === "settings" ||
    window.location.hash.startsWith("#/settings");

  return isSettings ? <SettingsWindow /> : <CompanionOverlay />;
}

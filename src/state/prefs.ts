import { invoke } from "@tauri-apps/api/core";
import { createPersisted } from "./persisted";

/**
 * How the companion looks and behaves on screen. Everything here is local —
 * no account, no sync, no telemetry.
 */
export interface Prefs {
  /** Pet size multiplier; resizes the overlay window itself. */
  petScale: number;
  /** 0.35–1: how present the pet feels over your work. */
  opacity: number;
  /** Opt-in chirps for celebrations, timers and reminders. */
  sound: boolean;
  soundVolume: number;
  /** Native OS notifications for timers and due reminders. */
  notifications: boolean;
  /** Vanish while a window is fullscreen (presentations, screen shares, games). */
  hideInFullscreen: boolean;
  /** Sit on the title bar of whatever window you are working in. */
  perch: boolean;
  /** Fall to the floor of the monitor when you let go of the pet. */
  gravity: boolean;
  /** Watch CI, review requests and uncommitted work in the chosen repo. */
  workStatus: boolean;
  /** Global accelerators; empty string unbinds. */
  hotkeyToggle: string;
  hotkeySummon: string;
  /** Integration ids the user switched off in the Studio. */
  disabledIntegrations: string[];
  /** First-run tour completed. */
  onboarded: boolean;
}

const DEFAULT_PREFS: Prefs = {
  petScale: 1,
  opacity: 1,
  sound: false,
  soundVolume: 0.35,
  notifications: true,
  hideInFullscreen: true,
  perch: false,
  gravity: false,
  workStatus: false,
  hotkeyToggle: "CommandOrControl+Shift+E",
  hotkeySummon: "CommandOrControl+Shift+F",
  disabledIntegrations: [],
  onboarded: false,
};

export const prefs = createPersisted<Prefs>("pilotwick.prefs", DEFAULT_PREFS);

/** Pushes the saved hotkeys to the OS. Returns an error message, or null. */
export async function applyHotkeys(p: Prefs = prefs.load()): Promise<string | null> {
  try {
    await invoke("apply_hotkeys", { toggle: p.hotkeyToggle, summon: p.hotkeySummon });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Turns a keyboard event into a Tauri accelerator string
 * (e.g. "CommandOrControl+Shift+E"), or null if it isn't a usable chord.
 */
export function accelFromEvent(e: React.KeyboardEvent | KeyboardEvent): string | null {
  const key = e.key;
  if (["Control", "Shift", "Alt", "Meta", "Dead"].includes(key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  // A bare letter would swallow normal typing system-wide.
  if (parts.length === 0) return null;

  const named: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Escape",
    Enter: "Enter",
    Tab: "Tab",
    Backspace: "Backspace",
  };
  parts.push(named[key] ?? key.toUpperCase());
  return parts.join("+");
}

/** "CommandOrControl+Shift+E" → "Ctrl + Shift + E" for display. */
export function prettyAccel(accel: string): string {
  if (!accel.trim()) return "Not set";
  const mac = navigator.platform.toLowerCase().includes("mac");
  return accel
    .split("+")
    .map((p) => (p === "CommandOrControl" ? (mac ? "⌘" : "Ctrl") : p))
    .join(" + ");
}

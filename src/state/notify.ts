import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { prefs } from "./prefs";

/**
 * Native OS notifications, used only for things you asked to be told about:
 * a finished focus session and a task reminder coming due. They matter most
 * when the pet is hidden or buried behind a fullscreen window, which is
 * exactly when a speech bubble would go unseen.
 */

let granted: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (granted !== null) return granted;
  try {
    granted = (await isPermissionGranted()) || (await requestPermission()) === "granted";
  } catch {
    granted = false; // Plugin unavailable (e.g. running in a plain browser).
  }
  return granted ?? false;
}

export async function notify(title: string, body: string) {
  if (!prefs.load().notifications) return;
  if (!(await ensurePermission())) return;
  try {
    sendNotification({ title, body });
  } catch {
    // A missing notification is never worth breaking the companion over.
  }
}

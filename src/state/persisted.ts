import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";

/**
 * A tiny persisted-setting factory.
 *
 * Pilotwick runs two windows (the overlay and the Studio) against one origin, so
 * every setting needs three things: it must survive a restart, it must be
 * readable synchronously on first paint, and a change in one window must
 * reach the other immediately. localStorage covers the first two; a Tauri
 * event covers the third (the DOM `storage` event only fires cross-document
 * in some webviews, so it is a fallback rather than the mechanism).
 */
export function createPersisted<T extends object>(key: string, fallback: T) {
  const event = `companion://changed/${key}`;

  function load(): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Save a partial update on top of whatever is currently stored. Partial by
   * design: two windows write the same key, and a whole-object write would
   * silently clobber a change the other one just made.
   */
  async function patch(update: Partial<T>): Promise<T> {
    const next = { ...load(), ...update };
    localStorage.setItem(key, JSON.stringify(next));
    // The write is what matters; the broadcast is a courtesy to the other
    // window. Letting a failed emit reject would abandon the caller's flow
    // after the setting had already been saved.
    await emit(event).catch(() => {});
    return next;
  }

  function use(): T {
    const [value, setValue] = useState<T>(load);
    useEffect(() => {
      const refresh = () => setValue(load());
      const un = listen(event, refresh);
      window.addEventListener("storage", refresh);
      return () => {
        un.then((fn) => fn());
        window.removeEventListener("storage", refresh);
      };
    }, []);
    return value;
  }

  return { key, event, load, patch, use };
}

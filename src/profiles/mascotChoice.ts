import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";

export type BuiltinMascot = "pixel" | "dog" | "mochi" | "dragon" | "custom";

const KEY = "pilotwick.mascot";
const EVENT = "companion://mascot-updated";

export function loadMascot(): BuiltinMascot {
  const v = localStorage.getItem(KEY);
  return v === "dragon" || v === "mochi" || v === "dog" || v === "custom" ? v : "pixel";
}

export async function setMascot(mascot: BuiltinMascot) {
  localStorage.setItem(KEY, mascot);
  await emit(EVENT).catch(() => {});
}

/** Which built-in mascot to render (only used when no custom profile is applied). */
export function useMascot(): BuiltinMascot {
  const [mascot, set] = useState<BuiltinMascot>(loadMascot);
  useEffect(() => {
    const refresh = () => set(loadMascot());
    const un = listen(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      un.then((fn) => fn());
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return mascot;
}

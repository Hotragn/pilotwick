import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { validateProfile, type CompanionProfile } from "./profileSchema";

/**
 * Profiles are stored as a real file in the app data folder — NOT in
 * localStorage, whose ~5 MB quota silently rejects bundled GIFs.
 */

const LEGACY_KEY = "pilotwick.profile.v1";
const PROFILE_EVENT = "companion://profile-updated";

let cachedPath: string | null = null;

async function profilePath(): Promise<string> {
  if (cachedPath) return cachedPath;
  const dir = await appDataDir();
  await mkdir(dir, { recursive: true }).catch(() => {});
  cachedPath = await join(dir, "companion-profile.json");
  return cachedPath;
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function loadProfileAsync(): Promise<CompanionProfile | null> {
  try {
    const path = await profilePath();
    if (!(await exists(path))) {
      // One-time migration from the old localStorage storage.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return null;
      await writeTextFile(path, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
    return validateProfile(JSON.parse(await readTextFile(path)));
  } catch {
    return null;
  }
}

/** Persist and broadcast to every window (overlay + studio). Throws on failure. */
export async function applyProfile(profile: CompanionProfile | null) {
  const path = await profilePath();
  if (profile) await writeTextFile(path, JSON.stringify(profile));
  else await remove(path).catch(() => {});
  await emit(PROFILE_EVENT);
}

// ─── Sharing: export / import bundled JSON ─────────────────────────────────

const FILE_FILTER = [{ name: "Companion Profile", extensions: ["companion.json", "json"] }];

export async function exportProfile(profile: CompanionProfile): Promise<string | null> {
  const slug = profile.meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "companion";
  const path = await save({ defaultPath: `${slug}.companion.json`, filters: FILE_FILTER });
  if (!path) return null;
  await writeTextFile(path, JSON.stringify(profile, null, 2));
  return path;
}

export async function importProfile(): Promise<CompanionProfile | null> {
  const path = await open({ multiple: false, filters: FILE_FILTER });
  if (!path || Array.isArray(path)) return null;
  const profile = validateProfile(JSON.parse(await readTextFile(path)));
  await applyProfile(profile);
  return profile;
}

// ─── Upload helper ─────────────────────────────────────────────────────────

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── React binding (cross-window reactive) ─────────────────────────────────

export function useProfile() {
  const [profile, setProfile] = useState<CompanionProfile | null>(null);

  useEffect(() => {
    const refresh = () => loadProfileAsync().then(setProfile);
    refresh();
    const unTauri = listen(PROFILE_EVENT, refresh);
    return () => {
      unTauri.then((fn) => fn());
    };
  }, []);

  return { profile, setProfile };
}

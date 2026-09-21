import { useEffect, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { useCompanionStore } from "./companionStore";
import { notify } from "./notify";
import { playCue } from "./sound";

/**
 * Wellness & care features: your name, stretch reminders, a Pomodoro timer
 * and a pinned message. Config lives in localStorage (shared by both
 * windows); changes broadcast a Tauri event so the overlay reacts instantly.
 */

export interface WellnessConfig {
  name: string;
  /** Minutes between stretch reminders; 0 = off. */
  stretchEveryMin: number;
  focusMin: number;
  breakMin: number;
  fixedMessage: string;
}

export interface PomodoroState {
  running: boolean;
  phase: "focus" | "break";
  endsAt: number;
}

const CONFIG_KEY = "pilotwick.wellness";
const POMO_KEY = "pilotwick.pomodoro";
const EVO_KEY = "pilotwick.evolution";
const EVENT = "companion://wellness-updated";

// ─── Pet evolution: completed focus sessions earn accessories ──────────────

export const EVOLUTION_TIERS = [
  { at: 3, name: "Red bandana", emoji: "🧣" },
  { at: 10, name: "Party hat", emoji: "🎩" },
  { at: 25, name: "Crown", emoji: "👑" },
] as const;

export function loadFocusCount(): number {
  return Number(localStorage.getItem(EVO_KEY) ?? 0) || 0;
}

async function bumpFocusCount(): Promise<number> {
  const n = loadFocusCount() + 1;
  localStorage.setItem(EVO_KEY, String(n));
  await emit(EVENT).catch(() => {});
  return n;
}

/** 0 = none, 1 = bandana, 2 = party hat, 3 = crown. */
export function evolutionLevel(focusCount: number): number {
  return EVOLUTION_TIERS.filter((t) => focusCount >= t.at).length;
}

export function useEvolution() {
  const [count, setCount] = useState<number>(loadFocusCount);
  useEffect(() => {
    const refresh = () => setCount(loadFocusCount());
    const un = listen(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      un.then((fn) => fn());
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { count, level: evolutionLevel(count) };
}

const DEFAULT_CONFIG: WellnessConfig = {
  name: "",
  stretchEveryMin: 0,
  focusMin: 25,
  breakMin: 5,
  fixedMessage: "",
};

export function loadConfig(): WellnessConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}") };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: WellnessConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  await emit(EVENT).catch(() => {});
}

export function loadPomodoro(): PomodoroState {
  try {
    return { running: false, phase: "focus", endsAt: 0, ...JSON.parse(localStorage.getItem(POMO_KEY) ?? "{}") };
  } catch {
    return { running: false, phase: "focus", endsAt: 0 };
  }
}

export async function savePomodoro(state: PomodoroState) {
  localStorage.setItem(POMO_KEY, JSON.stringify(state));
  await emit(EVENT).catch(() => {});
}

export async function startPomodoro(config: WellnessConfig) {
  await savePomodoro({ running: true, phase: "focus", endsAt: Date.now() + config.focusMin * 60_000 });
}

export async function stopPomodoro() {
  await savePomodoro({ running: false, phase: "focus", endsAt: 0 });
}

export function useWellnessConfig() {
  const [config, setConfig] = useState<WellnessConfig>(loadConfig);
  useEffect(() => {
    const refresh = () => setConfig(loadConfig());
    const un = listen(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      un.then((fn) => fn());
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return config;
}

/**
 * The care loop — runs once in the overlay window. Schedules stretch
 * reminders, advances the Pomodoro timer, and returns the live countdown.
 */
export function useCareLoop() {
  const config = useWellnessConfig();
  const [pomodoro, setPomodoro] = useState<PomodoroState>(loadPomodoro);
  const [, forceRender] = useState(0);
  const nextStretchAt = useRef(0);

  // Re-read pomodoro when the Studio starts/stops it.
  useEffect(() => {
    const refresh = () => setPomodoro(loadPomodoro());
    const un = listen(EVENT, refresh);
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  // Reset the stretch schedule whenever the interval setting changes.
  useEffect(() => {
    nextStretchAt.current = config.stretchEveryMin > 0 ? Date.now() + config.stretchEveryMin * 60_000 : 0;
  }, [config.stretchEveryMin]);

  useEffect(() => {
    const id = setInterval(() => {
      const store = useCompanionStore.getState();
      const now = Date.now();
      const who = config.name ? `${config.name}, ` : "";

      // Stretch reminders.
      if (nextStretchAt.current > 0 && now >= nextStretchAt.current) {
        nextStretchAt.current = now + config.stretchEveryMin * 60_000;
        store.startStretch(`${who}time to stretch! 🧘`);
        playCue("yawn");
      }

      // Pomodoro phase transitions.
      const p = loadPomodoro();
      if (p.running && now >= p.endsAt) {
        if (p.phase === "focus") {
          const next: PomodoroState = { running: true, phase: "break", endsAt: now + config.breakMin * 60_000 };
          savePomodoro(next);
          setPomodoro(next);
          // Evolution: each finished focus session counts toward accessories.
          bumpFocusCount().then((n) => {
            const tier = EVOLUTION_TIERS.find((t) => t.at === n);
            if (tier) store.say(`${who}your pet earned the ${tier.name}! ${tier.emoji}`, 8000);
          });
          store.celebrate(`${who}focus done — break time! ☕`);
          void notify("Focus session done", `Take a ${config.breakMin}-minute break.`);
        } else {
          const next: PomodoroState = { running: true, phase: "focus", endsAt: now + config.focusMin * 60_000 };
          savePomodoro(next);
          setPomodoro(next);
          store.say(`${who}back to focus! 🎯`, 6000);
          playCue("chirp");
          void notify("Break over", `Back to focus for ${config.focusMin} minutes.`);
        }
      }

      forceRender((n) => n + 1); // refresh the countdown display
    }, 1000);
    return () => clearInterval(id);
  }, [config]);

  const remainingMs = pomodoro.running ? Math.max(0, pomodoro.endsAt - Date.now()) : 0;
  return { config, pomodoro, remainingMs };
}

export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

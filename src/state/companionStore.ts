import { create } from "zustand";
import { resolveIntegration } from "../integrations/registry";
import { playCue } from "./sound";
import { bumpCounter } from "./stats";
import type { CompanionState } from "../integrations/types";

/** Typing is shown while a key was pressed within the last 1.5 s. */
const TYPING_WINDOW_MS = 1500;
/** Fall asleep after 90 s with no keyboard or hover activity. */
const SLEEP_AFTER_MS = 90_000;
/** An AI session longer than this earns a celebration when it ends. */
const LONG_TASK_MS = 45_000;
const CELEBRATE_FOR_MS = 4500;
/** Overheat: this many keys inside 2 s means you're typing like a maniac. */
const OVERHEAT_KEYS = 14;
const OVERHEAT_WINDOW_MS = 2000;
const OVERHEAT_FOR_MS = 3000;
/** Cursor faster than this (px/s) wakes the hunter instinct. */
export const HUNT_SPEED = 1500;
const HUNT_FOR_MS = 1200;
const STRETCH_FOR_MS = 14_000;
/** Waking up from a nap: yawn + morning stretch before anything else. */
const WAKE_FOR_MS = 2600;
/** Playing with the yarn ball after a scroll. */
const PLAY_FOR_MS = 1500;

export interface Gaze {
  /** Normalized -1..1 offset of the cursor relative to the pet's center. */
  x: number;
  y: number;
}

interface CompanionStore {
  state: CompanionState;
  gaze: Gaze;
  hovering: boolean;
  activeApp: { app: string; title: string };
  /** Set by the matched integration, e.g. "AI Sync · Claude". */
  contextLabel: string | null;
  /** Speech bubble above the pet, e.g. reminders or "task done!". */
  bubble: { text: string; until: number } | null;

  lastKeyAt: number;
  keyTimes: number[];
  lastActivityAt: number;
  aiSince: number | null;
  celebrateUntil: number;
  overheatUntil: number;
  huntUntil: number;
  stretchUntil: number;
  wakingUntil: number;
  playUntil: number;
  grumpyUntil: number;

  noteKeyActivity: () => void;
  /** Merge conflict! The pet hisses. */
  hiss: () => void;
  noteFastCursor: () => void;
  noteScroll: () => void;
  setGaze: (gaze: Gaze, hovering: boolean) => void;
  setActiveApp: (app: string, title: string) => void;
  celebrate: (message?: string) => void;
  startStretch: (message?: string) => void;
  say: (text: string, forMs?: number) => void;
  /** The heartbeat: re-derives the current state from all signals. */
  tick: () => void;
}

export const useCompanionStore = create<CompanionStore>((set, get) => ({
  state: "idle",
  gaze: { x: 0, y: 0 },
  hovering: false,
  activeApp: { app: "", title: "" },
  contextLabel: null,
  bubble: null,

  lastKeyAt: 0,
  keyTimes: [],
  lastActivityAt: Date.now(),
  aiSince: null,
  celebrateUntil: 0,
  overheatUntil: 0,
  huntUntil: 0,
  stretchUntil: 0,
  wakingUntil: 0,
  playUntil: 0,
  grumpyUntil: 0,

  noteKeyActivity: () => {
    const now = Date.now();
    const keyTimes = [...get().keyTimes.filter((t) => now - t < OVERHEAT_WINDOW_MS), now];
    const patch: Partial<CompanionStore> = { lastKeyAt: now, lastActivityAt: now, keyTimes };
    if (keyTimes.length >= OVERHEAT_KEYS) patch.overheatUntil = now + OVERHEAT_FOR_MS;
    set(patch as CompanionStore);
  },

  noteFastCursor: () => set({ huntUntil: Date.now() + HUNT_FOR_MS }),

  hiss: () => {
    playCue("alert");
    const now = Date.now();
    set({ grumpyUntil: now + 6000, bubble: { text: "hisss! merge conflict 🙀", until: now + 6000 } });
  },

  noteScroll: () => {
    const now = Date.now();
    // Scrolling is activity too, and only playful when not mid-typing.
    set({ playUntil: now + PLAY_FOR_MS, lastActivityAt: now });
  },

  setGaze: (gaze, hovering) => {
    // Hovering the pet counts as activity (it wakes up when petted).
    set(hovering ? { gaze, hovering, lastActivityAt: Date.now() } : { gaze, hovering });
  },

  setActiveApp: (app, title) => set({ activeApp: { app, title } }),

  celebrate: (message) => {
    // Every celebration funnels through here, so this is the one place the
    // fanfare needs to be wired up.
    playCue("celebrate");
    const patch: Partial<CompanionStore> = { celebrateUntil: Date.now() + CELEBRATE_FOR_MS };
    if (message) patch.bubble = { text: message, until: Date.now() + CELEBRATE_FOR_MS };
    set(patch as CompanionStore);
  },

  startStretch: (message) => {
    const now = Date.now();
    set({
      stretchUntil: now + STRETCH_FOR_MS,
      bubble: message ? { text: message, until: now + 6000 } : get().bubble,
    });
  },

  say: (text, forMs = 5000) => set({ bubble: { text, until: Date.now() + forMs } }),

  tick: () => {
    const s = get();
    const now = Date.now();
    const integration = resolveIntegration(s.activeApp);

    // --- Long-task heuristic: an AI-sync session ends → celebrate.
    const inAiState = integration?.state === "ai-sync";
    let { aiSince, celebrateUntil } = s;
    let bubble = s.bubble && s.bubble.until > now ? s.bubble : null;
    if (inAiState && aiSince === null) aiSince = now;
    if (!inAiState && aiSince !== null) {
      if (now - aiSince >= LONG_TASK_MS) {
        celebrateUntil = now + CELEBRATE_FOR_MS;
        bubble = { text: "Agent done! 🎉", until: now + CELEBRATE_FOR_MS };
        bumpCounter("aiSessions");
        playCue("celebrate");
      }
      aiSince = null;
    }

    // --- Priority ladder.
    let next: CompanionState;
    let label: string | null = null;
    if (celebrateUntil > now) {
      next = "celebrating";
      label = "Task complete!";
    } else if (s.grumpyUntil > now) {
      next = "grumpy";
      label = "Merge conflict!";
    } else if (s.stretchUntil > now) {
      next = "stretching";
    } else if (s.overheatUntil > now) {
      next = "overheat";
      label = "Overheating!";
    } else if (s.wakingUntil > now) {
      next = "waking";
    } else if (s.hovering) {
      next = "petting";
    } else if (s.huntUntil > now && now - s.lastKeyAt > TYPING_WINDOW_MS) {
      next = "hunting";
    } else if (now - s.lastKeyAt < TYPING_WINDOW_MS) {
      next = "typing";
      label = integration ? integration.label(s.activeApp) : null;
    } else if (s.playUntil > now) {
      next = "playing";
    } else if (integration) {
      next = integration.state;
      label = integration.label(s.activeApp);
    } else if (now - Math.max(s.lastActivityAt, s.lastKeyAt) > SLEEP_AFTER_MS) {
      next = "sleeping";
    } else {
      next = "idle";
    }

    // Waking from a nap earns a yawn + morning stretch first.
    let wakingUntil = s.wakingUntil;
    if (s.state === "sleeping" && next !== "sleeping" && next !== "celebrating") {
      wakingUntil = now + WAKE_FOR_MS;
      next = "waking";
    }

    if (
      next !== s.state ||
      aiSince !== s.aiSince ||
      celebrateUntil !== s.celebrateUntil ||
      wakingUntil !== s.wakingUntil ||
      label !== s.contextLabel ||
      bubble !== s.bubble
    ) {
      set({ state: next, aiSince, celebrateUntil, wakingUntil, contextLabel: label, bubble });
    }
  },
}));

import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { HUNT_SPEED, useCompanionStore } from "./companionStore";
import { bumpCounter, bumpState } from "./stats";

interface CursorPayload {
  x: number;
  y: number;
  wx: number;
  wy: number;
  ww: number;
  wh: number;
  hovering: boolean;
}

/**
 * The bridge between the Rust watchers and the React state machine.
 * Mount it once in the overlay window; everything else just reads the store.
 */
export function useContextEngine() {
  useEffect(() => {
    const store = useCompanionStore.getState;
    let last: { x: number; y: number; t: number } | null = null;

    const unCursor = listen<CursorPayload>("companion://cursor", ({ payload: p }) => {
      const cx = p.wx + p.ww / 2;
      const cy = p.wy + p.wh / 2;
      // Normalize so the eyes saturate ~300px away from the pet.
      const gaze = {
        x: Math.max(-1, Math.min(1, (p.x - cx) / 300)),
        y: Math.max(-1, Math.min(1, (p.y - cy) / 300)),
      };
      store().setGaze(gaze, p.hovering);

      // Fast cursor movement triggers the hunter instinct.
      const now = performance.now();
      if (last && now > last.t) {
        const speed = (Math.hypot(p.x - last.x, p.y - last.y) / (now - last.t)) * 1000;
        if (speed > HUNT_SPEED && !p.hovering) store().noteFastCursor();
      }
      last = { x: p.x, y: p.y, t: now };
    });

    const unKeys = listen("companion://keyboard", () => store().noteKeyActivity());
    const unScroll = listen("companion://scroll", () => store().noteScroll());

    const unApp = listen<{ app: string; title: string }>(
      "companion://active-app",
      ({ payload }) => store().setActiveApp(payload.app, payload.title)
    );

    // Git reactions: celebrate commits, hiss at merge conflicts.
    const unGit = listen<{ kind: string; detail: string }>("companion://git", ({ payload }) => {
      const s = store();
      if (payload.kind === "commit") {
        bumpCounter("commits");
        s.celebrate("Committed! 🚀");
      } else if (payload.kind === "conflict") s.hiss();
      else if (payload.kind === "resolved") s.say("Conflict resolved 😌", 4000);
      else if (payload.kind === "branch") s.say(`On ${payload.detail} 🌿`, 4000);
    });

    const heartbeat = setInterval(() => {
      store().tick();
      bumpState(store().state as string, 400); // daily stats
    }, 400);

    return () => {
      unCursor.then((fn) => fn());
      unKeys.then((fn) => fn());
      unScroll.then((fn) => fn());
      unApp.then((fn) => fn());
      unGit.then((fn) => fn());
      clearInterval(heartbeat);
    };
  }, []);
}

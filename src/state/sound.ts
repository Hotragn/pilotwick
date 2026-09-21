import { prefs } from "./prefs";

/**
 * Opt-in sound, synthesized on the fly.
 *
 * Desktop pets get uninstalled when they become noise, so every cue here is
 * short, soft and off by default. Synthesizing with WebAudio instead of
 * shipping samples also keeps the installer tiny and the repo free of
 * licence-encumbered audio.
 */

export type Cue = "chirp" | "celebrate" | "alert" | "pop" | "yawn";

/** note: frequency in Hz · at: offset in seconds · dur: length in seconds */
type Note = { note: number; at: number; dur: number; type?: OscillatorType };

const CUES: Record<Cue, Note[]> = {
  // A soft two-note hello.
  chirp: [
    { note: 880, at: 0, dur: 0.07 },
    { note: 1174, at: 0.06, dur: 0.09 },
  ],
  // Rising major arpeggio — the "your agent finished" fanfare.
  celebrate: [
    { note: 659, at: 0, dur: 0.1 },
    { note: 831, at: 0.09, dur: 0.1 },
    { note: 988, at: 0.18, dur: 0.12 },
    { note: 1319, at: 0.28, dur: 0.22 },
  ],
  // Attention without alarm: two calm descending tones.
  alert: [
    { note: 784, at: 0, dur: 0.13, type: "triangle" },
    { note: 587, at: 0.16, dur: 0.2, type: "triangle" },
  ],
  // UI tick for opening the ring or ticking a task off.
  pop: [{ note: 1046, at: 0, dur: 0.045 }],
  // A sleepy downward slide for naps and break time.
  yawn: [
    { note: 494, at: 0, dur: 0.18, type: "sine" },
    { note: 392, at: 0.15, dur: 0.3, type: "sine" },
  ],
};

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  // Autoplay policies can leave the context suspended until a gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Plays a cue, unless the user has sound switched off. */
export function playCue(cue: Cue) {
  const { sound, soundVolume } = prefs.load();
  if (!sound) return;

  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + 0.01;
  const gainScale = Math.max(0, Math.min(1, soundVolume));

  for (const n of CUES[cue]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.note;

    // A short attack/decay envelope — a raw gate would click.
    const t0 = start + n.at;
    const peak = 0.18 * gainScale;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
}

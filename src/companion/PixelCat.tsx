import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCompanionStore } from "../state/companionStore";
import { useEvolution } from "../state/wellness";
import type { CompanionState } from "../integrations/types";
import PixelStage from "./PixelStage";

/**
 * Facial features and props keep their exact colour; only the body
 * silhouette is shaded, or the eyes would pick up a gradient.
 */
const FLAT = new Set(["S", "E", "P", "Y", "H", "R", "g", "G", "D"]);

/**
 * Idle fidgets. A pet that only ever does its one idle loop reads as a
 * screensaver, so every few seconds an idle cat glances around, twitches an
 * ear or has a quick wash. These are deliberately small — the point is that
 * you catch it out of the corner of your eye, not that it demands attention.
 */
type Fidget = "none" | "lookLeft" | "lookRight" | "earTwitch" | "groom";
const FIDGETS: Fidget[] = ["lookLeft", "lookRight", "earTwitch", "groom"];
const FIDGET_EVERY_MS = 5200;
const FIDGET_CHANCE = 0.55;
const FIDGET_FOR_MS = 1400;

/**
 * Pixel — the default mascot. A tiny black silhouette cat with big white
 * eyes, in the style of classic pixel desktop pets: mostly dark body, the
 * personality lives in the eyes, whiskers and tail. Two hand-drawn poses:
 * sitting, and leaning over two keycaps that it kneads while you type.
 */

const W = 20;

// B body · S white (eyes/marks) · E pupil · P pink (nose/mouth/blush)
// Y gold · H accessory grey · R bandana red · g/G/D keycap top/face/side
const BASE_PALETTE: Record<string, string> = {
  B: "#2e2428",
  E: "#2e2428",
  S: "#ffffff",
  P: "#f491b2",
  Y: "#ffd166",
  H: "#6d6875",
  R: "#e63946",
  g: "#dcd8da",
  G: "#b1abae",
  D: "#847e82",
};

const HOT_PALETTE: Record<string, string> = { ...BASE_PALETTE, B: "#93323c", E: "#93323c" };

// Sitting pose — ears, big eye rings, whiskers poking out, curled tail.
const SIT: string[] = [
  "....B..........B....",
  "....BB........BB....",
  "....BBB......BBB....",
  "....BBBBBBBBBBBB....",
  "...BBBBBBBBBBBBBB...",
  "...BSSSBBBBBBSSSB...",
  "B..BSESBBBBBBSESB..B",
  "...BSSSBBBBBBSSSB...",
  "B..BBBBBBPPBBBBBB..B",
  "...BBBBBBBBBBBBBB...",
  "....BBBBBBBBBBBB....",
  "....BBBBBBBBBB......",
  "....BBBBBBBBBB..BB..",
  "....BBBBBBBBBB.BB...",
  "....BBBBBBBBBB.BB...",
  "....BBBBBBBBBBBB....",
  "....BB..BBBB..BB....",
  "....BB........BB....",
];

// Typing pose — same head, body leaning over two grey keycaps.
const TYPE: string[] = [
  ...SIT.slice(0, 10),
  "....BBBBBBBBBBBB....",
  "....BBBBBBBBBB.BB...",
  "....BB........BB....",
  ".gggggg......gggggg.",
  ".GGGGGG......GGGGGG.",
  ".DDDDDD......DDDDDD.",
];

type Cell = [row: number, col: number, ch: string];

function apply(rows: string[], cells: Cell[]): string[] {
  const out = rows.map((r) => r.split(""));
  for (const [r, c, ch] of cells) {
    if (out[r] && c >= 0 && c < W) out[r][c] = ch;
  }
  return out.map((r) => r.join(""));
}

// ── Eyes (same coordinates in both poses) ───────────────────────────────────
const EYE_AREA: Cell[] = [];
for (const r of [5, 6, 7]) for (const c of [4, 5, 6, 13, 14, 15]) EYE_AREA.push([r, c, "B"]);

const eyesClosed: Cell[] = [
  ...EYE_AREA,
  [6, 4, "S"], [6, 5, "S"], [6, 6, "S"], [6, 13, "S"], [6, 14, "S"], [6, 15, "S"],
];
const eyesHappy: Cell[] = [
  ...EYE_AREA,
  [6, 4, "S"], [5, 5, "S"], [6, 6, "S"], [6, 13, "S"], [5, 14, "S"], [6, 15, "S"],
];
const eyesSqueeze: Cell[] = [
  ...EYE_AREA,
  [5, 4, "S"], [6, 5, "S"], [7, 4, "S"], [5, 15, "S"], [6, 14, "S"], [7, 15, "S"],
];
const eyesStarry: Cell[] = [
  ...EYE_AREA,
  ...[4, 13].flatMap((c): Cell[] => [
    [5, c, "Y"], [5, c + 1, "Y"], [5, c + 2, "Y"],
    [6, c, "Y"], [6, c + 1, "S"], [6, c + 2, "Y"],
    [7, c, "Y"], [7, c + 1, "Y"], [7, c + 2, "Y"],
  ]),
];

const yawnMouth: Cell[] = [[8, 9, "P"], [8, 10, "P"], [9, 9, "P"], [9, 10, "P"]];
const openMouth: Cell[] = [[9, 9, "P"], [9, 10, "P"]];
const blush: Cell[] = [[8, 4, "P"], [8, 5, "P"], [8, 14, "P"], [8, 15, "P"]];

// ── Accessories (evolution rewards) ─────────────────────────────────────────
const bandana: Cell[] = Array.from({ length: 10 }, (_, i): Cell => [10, 5 + i, "R"]);
const partyHat: Cell[] = [
  [0, 9, "Y"], [0, 10, "Y"],
  [1, 8, "Y"], [1, 9, "P"], [1, 10, "Y"], [1, 11, "Y"],
  [2, 8, "Y"], [2, 9, "Y"], [2, 10, "Y"], [2, 11, "Y"],
];
const crown: Cell[] = [
  [0, 7, "Y"], [0, 9, "Y"], [0, 10, "Y"], [0, 12, "Y"],
  [1, 7, "Y"], [1, 8, "Y"], [1, 9, "Y"], [1, 10, "Y"], [1, 11, "Y"], [1, 12, "Y"],
];
const ACCESSORIES: Cell[][] = [[], bandana, partyHat, crown];

const headphones: Cell[] = [
  ...Array.from({ length: 6 }, (_, i): Cell => [2, 7 + i, "H"]),
  [5, 2, "H"], [6, 2, "H"], [7, 2, "H"], [6, 3, "H"],
  [5, 17, "H"], [6, 17, "H"], [7, 17, "H"], [6, 16, "H"],
];

// Tail wag (per pose) and keycap kneading.
const sitTailUp: Cell[] = [[14, 15, "."], [14, 16, "."], [11, 16, "B"], [11, 17, "B"]];
const typeTailUp: Cell[] = [[11, 15, "."], [11, 16, "."], [10, 16, "B"], [10, 17, "B"]];
const kneadLeft: Cell[] = [
  [13, 3, "B"], [13, 4, "B"], // paw lands on the left key…
  [13, 1, "G"], [13, 2, "G"], [13, 5, "G"], [13, 6, "G"], // …which presses down
];
const kneadRight: Cell[] = [
  [13, 15, "B"], [13, 16, "B"],
  [13, 13, "G"], [13, 14, "G"], [13, 17, "G"], [13, 18, "G"],
];

type Eyes = "open" | "closed" | "happy" | "squeeze" | "starry";

const FACES: Record<
  string,
  { eyes: Eyes; pose?: "type"; hot?: boolean; phones?: boolean; openMouth?: boolean; yawn?: boolean; blush?: boolean }
> = {
  idle: { eyes: "open" },
  petting: { eyes: "happy", blush: true, openMouth: true },
  sleeping: { eyes: "closed" },
  waking: { eyes: "closed", yawn: true },
  typing: { eyes: "open", pose: "type" },
  overheat: { eyes: "squeeze", pose: "type", hot: true, openMouth: true },
  hunting: { eyes: "open" },
  playing: { eyes: "open" },
  stretching: { eyes: "happy" },
  // Co-working: the cat types along while your AI agent thinks.
  "ai-sync": { eyes: "open", pose: "type" },
  coding: { eyes: "open", pose: "type" },
  celebrating: { eyes: "starry", openMouth: true },
  grumpy: { eyes: "squeeze", openMouth: true },
  vibing: { eyes: "happy", phones: true },
  watching: { eyes: "open" },
  gaming: { eyes: "open" },
  chatting: { eyes: "open", openMouth: true },
  designing: { eyes: "open" },
  writing: { eyes: "open", pose: "type" },
  browsing: { eyes: "open" },
};

export default function PixelCat({ state }: { state: CompanionState }) {
  const gaze = useCompanionStore((s) => s.gaze);
  const { level } = useEvolution();
  const face = FACES[state as string] ?? FACES.idle;
  const [tick, setTick] = useState(0);

  const [fidget, setFidget] = useState<Fidget>("none");

  useEffect(() => {
    const speed = face.pose === "type" || state === "celebrating" || state === "hunting" ? 190 : 420;
    const id = setInterval(() => setTick((t) => t + 1), speed);
    return () => clearInterval(id);
  }, [state, face.pose]);

  // Fidgets only belong to a calm, unoccupied cat.
  useEffect(() => {
    if (state !== "idle") {
      setFidget("none");
      return;
    }
    const id = setInterval(() => {
      if (Math.random() > FIDGET_CHANCE) return;
      setFidget(FIDGETS[Math.floor(Math.random() * FIDGETS.length)]);
      setTimeout(() => setFidget("none"), FIDGET_FOR_MS);
    }, FIDGET_EVERY_MS);
    return () => clearInterval(id);
  }, [state]);

  const rows = useMemo(() => {
    let g = face.pose === "type" ? TYPE : SIT;

    // An ear flicks up for a moment.
    if (fidget === "earTwitch") g = apply(g, [[0, 4, "."], [1, 4, "B"], [0, 5, "B"]]);

    if (fidget === "groom") g = apply(g, [...eyesHappy, [9, 9, "P"], [9, 10, "P"]]);
    else if (face.eyes === "open") {
      // The pupil glances toward your cursor, unless a fidget overrides it.
      const glance = fidget === "lookLeft" ? -1 : fidget === "lookRight" ? 1 : 0;
      const dx = glance !== 0 ? glance : gaze.x > 0.3 ? 1 : gaze.x < -0.3 ? -1 : 0;
      const dy = glance !== 0 ? 0 : gaze.y > 0.4 ? 1 : gaze.y < -0.4 ? -1 : 0;
      if (dx !== 0 || dy !== 0) {
        g = apply(g, [
          [6, 5, "S"], [6, 14, "S"],
          [6 + dy, 5 + dx, "E"], [6 + dy, 14 + dx, "E"],
        ]);
      }
      if (tick % 9 === 8) g = apply(g, eyesClosed); // blink
    }
    if (face.eyes === "closed") g = apply(g, eyesClosed);
    else if (face.eyes === "happy") g = apply(g, eyesHappy);
    else if (face.eyes === "squeeze") g = apply(g, eyesSqueeze);
    else if (face.eyes === "starry") g = apply(g, eyesStarry);

    if (face.openMouth) g = apply(g, openMouth);
    if (face.yawn) g = apply(g, yawnMouth);
    if (face.blush) g = apply(g, blush);
    if (face.phones) g = apply(g, headphones);
    if (face.pose === "type") g = apply(g, tick % 2 ? kneadLeft : kneadRight);
    if (tick % 2 && state !== "sleeping") g = apply(g, face.pose === "type" ? typeTailUp : sitTailUp);
    if (level > 0 && !face.phones) g = apply(g, ACCESSORIES[Math.min(level, 3)]);
    return g;
  }, [face, gaze.x, gaze.y, tick, state, level, fidget]);

  const palette = face.hot ? HOT_PALETTE : BASE_PALETTE;

  const body: Variants = {
    idle: { y: [0, -1.5, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
    petting: { rotate: [-2, 2, -2], transition: { duration: 0.5, repeat: Infinity } },
    sleeping: { y: 4, scaleY: 0.92, transition: { duration: 1 } },
    waking: { scaleY: [0.92, 1.2, 1.04, 1], scaleX: [1, 0.9, 0.98, 1], y: [4, -5, 0, 0], transition: { duration: 2.4 } },
    playing: { rotate: [-3, 3, -3], y: [0, -2, 0], transition: { duration: 0.4, repeat: Infinity } },
    typing: { y: [0, -1, 0], transition: { duration: 0.19, repeat: Infinity } },
    overheat: { x: [-1.2, 1.2, -1.2], transition: { duration: 0.12, repeat: Infinity } },
    hunting: { x: [-4, 4, -4], y: [0, -3, 0], transition: { duration: 0.35, repeat: Infinity } },
    stretching: { scaleY: [1, 1.3, 1.3, 1], scaleX: [1, 0.9, 0.9, 1], transition: { duration: 2.4, repeat: Infinity } },
    "ai-sync": { y: [0, -1, 0], transition: { duration: 0.3, repeat: Infinity } },
    coding: { y: [0, -1, 0], transition: { duration: 0.24, repeat: Infinity } },
    writing: { y: [0, -1, 0], transition: { duration: 0.3, repeat: Infinity } },
    celebrating: { y: [0, -20, 0, -12, 0], rotate: [0, -4, 4, 0, 0], transition: { duration: 0.8, repeat: Infinity } },
    grumpy: { x: [-2, 2, -2], scaleY: [1, 1.06, 1], transition: { duration: 0.18, repeat: Infinity } },
    vibing: { rotate: [-4, 4, -4], y: [0, -2, 0], transition: { duration: 0.65, repeat: Infinity } },
  };
  const variant = (body[state as string] ? state : "idle") as string;

  return (
    <div className="relative h-full w-full">
      <PixelStage
        rows={rows}
        palette={palette}
        width={W}
        flat={FLAT}
        // The cat lifts off the ground when it jumps, so the contact shadow
        // shrinks to match instead of staying pinned under a mid-air pet.
        shadow={state === "celebrating" || state === "hunting" ? 0.55 : 1}
        variants={body}
        animate={variant}
      />
      <PixelOverlays state={state} />
    </div>
  );
}

/** Floating props per state (steam, hearts, zzz, notes, confetti…). */
function PixelOverlays({ state }: { state: CompanionState }) {
  const floaters: Record<string, { items: string[]; cls: string }> = {
    petting: { items: ["💗", "💕"], cls: "text-base" },
    overheat: { items: ["💨", "♨️", "💨"], cls: "text-base" },
    hunting: { items: ["❗"], cls: "text-lg" },
    waking: { items: ["🥱"], cls: "text-lg" },
    playing: { items: ["🧶"], cls: "text-lg" },
    grumpy: { items: ["💢", "💢"], cls: "text-lg" },
    "ai-sync": { items: ["✦", "✧", "✦"], cls: "text-base text-violet-300" },
    coding: { items: ["</>", "{ }"], cls: "font-mono text-xs font-bold text-emerald-300" },
    vibing: { items: ["♪", "♫"], cls: "text-lg text-pink-300" },
    watching: { items: ["🍿"], cls: "text-lg" },
    gaming: { items: ["🎮"], cls: "text-lg" },
    chatting: { items: ["💬"], cls: "text-base" },
    designing: { items: ["🎨"], cls: "text-base" },
    writing: { items: ["✍️"], cls: "text-base" },
    browsing: { items: ["🔍"], cls: "text-base" },
    stretching: { items: ["🧘"], cls: "text-base" },
    celebrating: { items: ["🎉", "✨", "⭐", "✨"], cls: "text-base" },
  };

  return (
    <AnimatePresence>
      {state === "sleeping" && (
        <motion.div key="zzz" className="absolute right-4 top-1" exit={{ opacity: 0 }}>
          {["z", "z", "Z"].map((z, i) => (
            <motion.span
              key={i}
              className="absolute font-bold text-sky-300"
              style={{ right: i * 12, fontSize: 12 + i * 5 }}
              animate={{ y: [0, -16], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55 }}
            >
              {z}
            </motion.span>
          ))}
        </motion.div>
      )}
      {floaters[state as string] && (
        <motion.div key={state as string} className="absolute inset-0" exit={{ opacity: 0 }}>
          {floaters[state as string].items.map((item, i, arr) => (
            <motion.span
              key={i}
              className={`absolute ${floaters[state as string].cls}`}
              style={{ left: `${20 + (i * 56) / Math.max(1, arr.length - 1 || 1)}%`, top: "0%" }}
              animate={
                state === "celebrating"
                  ? { y: [0, 55], opacity: [1, 0], rotate: [0, i % 2 ? 140 : -140] }
                  : { y: [0, -12, 0], opacity: [0.35, 1, 0.35] }
              }
              transition={{ duration: state === "celebrating" ? 1 : 1.5, repeat: Infinity, delay: i * 0.3 }}
            >
              {item}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

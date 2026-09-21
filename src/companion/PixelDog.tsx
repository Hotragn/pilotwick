import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCompanionStore } from "../state/companionStore";
import { useEvolution } from "../state/wellness";
import type { CompanionState } from "../integrations/types";
import PixelStage from "./PixelStage";

/** Eyes, nose, tongue and props keep their exact colour. */
const FLAT = new Set(["E", "S", "N", "P", "R", "H", "Y", "K"]);

/**
 * Biscuit — the pixel dog. Floppy ears, a brown eye patch, a big nose and a
 * tongue that comes out when it's happy. Same state machine as the cat, but
 * dog-coded: faster tail, more excitement, zero dignity.
 */

const W = 24;

const BASE_PALETTE: Record<string, string> = {
  K: "#33272a",
  W: "#fff6ea",
  O: "#c68b59", // brown patches + ears
  D: "#a9714b", // darker brown (ear shading)
  P: "#f4989c", // tongue
  R: "#ffb0a0", // blush / bandana
  E: "#33272a",
  S: "#ffffff",
  N: "#33272a", // big dog nose
  H: "#4a4e69",
  Y: "#ffcf3f",
};

const HOT_PALETTE: Record<string, string> = { ...BASE_PALETTE, W: "#ffc4ae", O: "#f25c54" };

// Floppy ears hang down the sides of the head; brown patch over the right eye.
const BASE: string[] = [
  "...KKKKKKKKKKKKKKKKKK...",
  "..KOOKWWWWWWWWWWWWKOOK..",
  ".KODOKWWWWWWWWWWWWKODOK.",
  ".KODOKWWWWWWWWWWWWKODOK.",
  ".KODOKWWWWWWWWOOWWKODOK.",
  ".KODOKWWWWWWWOOOOWKODOK.",
  ".KOOOKWWWWWWWOOOOWKOOOK.",
  "..KKKWWESWWWWOESOWKKK...",
  "....KWWEEWWWWOEEOWK.....",
  "....KWWWWWWWWWOOWWK.....",
  "....KWWWWWKNNKWWWWK.....",
  "....KWRRWWKNNKWWRRWK....",
  "....KWWWWWWKKWWWWWWK....",
  "...KWWWWWWWWWWWWWWWWK...",
  "..KWWWWWWWWWWWWWWWWWWK..",
  "..KWOOWWWWWWWWWWWWWWWK..",
  "..KWWWWWWWWWWWWWWWWWWK..",
  "..KWWWWKWWWWWWWWKWWWWKO.",
  "..KKKKKKKKKKKKKKKKKKKKOO",
];

type Cell = [row: number, col: number, ch: string];

function apply(rows: string[], cells: Cell[]): string[] {
  const out = rows.map((r) => r.split(""));
  for (const [r, c, ch] of cells) {
    if (out[r] && c >= 0 && c < W) out[r][c] = ch;
  }
  return out.map((r) => r.join(""));
}

const EYES = [
  [7, 7], [7, 8], [8, 7], [8, 8],
  [7, 14], [7, 15], [8, 14], [8, 15],
] as const;

const eyesClosed: Cell[] = EYES.map(([r, c]): Cell => [r, c, r === 8 ? "K" : "W"]);
const eyesHappy: Cell[] = EYES.map(([r, c]): Cell => [r, c, r === 7 ? "K" : "W"]);
const eyesSqueeze: Cell[] = [
  [7, 7, "K"], [7, 8, "W"], [8, 7, "W"], [8, 8, "K"],
  [7, 14, "W"], [7, 15, "K"], [8, 14, "K"], [8, 15, "W"],
];
const eyesStarry: Cell[] = EYES.map(([r, c]): Cell => [r, c, "Y"]);

// Tongue out (dogs are almost always happy).
const tongue: Cell[] = [[12, 11, "P"], [12, 12, "P"], [13, 11, "P"], [13, 12, "P"]];
const yawnMouth: Cell[] = [
  [11, 10, "P"], [11, 11, "P"], [11, 12, "P"], [11, 13, "P"],
  [12, 10, "P"], [12, 11, "P"], [12, 12, "P"], [12, 13, "P"],
];

const headphones: Cell[] = [
  ...Array.from({ length: 10 }, (_, i): Cell => [0, 7 + i, "H"]),
  [7, 2, "H"], [8, 2, "H"], [7, 3, "H"], [8, 3, "H"],
  [7, 20, "H"], [8, 20, "H"], [7, 21, "H"], [8, 21, "H"],
];

const tailUp: Cell[] = [[17, 22, "."], [18, 22, "O"], [18, 23, "."], [16, 22, "O"], [17, 23, "O"]];
const kneadLeft: Cell[] = [[17, 3, "O"], [17, 4, "O"], [17, 5, "O"], [17, 6, "O"]];
const kneadRight: Cell[] = [[17, 17, "O"], [17, 18, "O"], [17, 19, "O"], [17, 20, "O"]];

const bandana: Cell[] = Array.from({ length: 14 }, (_, i): Cell => [13, 5 + i, "R"]);
const partyHat: Cell[] = [
  [0, 11, "Y"], [0, 12, "Y"],
  [1, 10, "Y"], [1, 11, "P"], [1, 12, "Y"], [1, 13, "Y"],
];
const crown: Cell[] = [
  [0, 9, "Y"], [0, 11, "Y"], [0, 12, "Y"], [0, 14, "Y"],
  [1, 9, "Y"], [1, 10, "Y"], [1, 11, "Y"], [1, 12, "Y"], [1, 13, "Y"], [1, 14, "Y"],
];
const ACCESSORIES: Cell[][] = [[], bandana, partyHat, crown];

type Eyes = "open" | "closed" | "happy" | "squeeze" | "starry";

const FACES: Record<string, { eyes: Eyes; hot?: boolean; phones?: boolean; knead?: boolean; tongue?: boolean; yawn?: boolean }> = {
  idle: { eyes: "open", tongue: true },
  petting: { eyes: "happy", tongue: true },
  sleeping: { eyes: "closed" },
  waking: { eyes: "closed", yawn: true },
  typing: { eyes: "open", knead: true },
  overheat: { eyes: "squeeze", hot: true, tongue: true },
  hunting: { eyes: "open", tongue: true },
  playing: { eyes: "happy", knead: true, tongue: true },
  stretching: { eyes: "happy" },
  "ai-sync": { eyes: "open", knead: true },
  coding: { eyes: "open", knead: true },
  celebrating: { eyes: "starry", tongue: true },
  grumpy: { eyes: "squeeze" },
  vibing: { eyes: "happy", phones: true },
  watching: { eyes: "open" },
  gaming: { eyes: "open" },
  chatting: { eyes: "open", tongue: true },
  designing: { eyes: "open" },
  writing: { eyes: "open" },
  browsing: { eyes: "open" },
};

export default function PixelDog({ state }: { state: CompanionState }) {
  const gaze = useCompanionStore((s) => s.gaze);
  const { level } = useEvolution();
  const face = FACES[state as string] ?? FACES.idle;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const speed = face.knead || state === "celebrating" || state === "hunting" ? 160 : 380;
    const id = setInterval(() => setTick((t) => t + 1), speed);
    return () => clearInterval(id);
  }, [state, face.knead]);

  const rows = useMemo(() => {
    let g = BASE;
    if (face.eyes === "open") {
      const dx = gaze.x > 0.3 ? 1 : gaze.x < -0.3 ? -1 : 0;
      if (dx !== 0) g = apply(g, [[7, 8, "E"], [7, 15, "E"], [7, 8 + dx, "S"], [7, 15 + dx, "S"]]);
      if (tick % 8 === 7) g = apply(g, eyesClosed);
    } else if (face.eyes === "closed") g = apply(g, eyesClosed);
    else if (face.eyes === "happy") g = apply(g, eyesHappy);
    else if (face.eyes === "squeeze") g = apply(g, eyesSqueeze);
    else if (face.eyes === "starry") g = apply(g, eyesStarry);

    if (face.tongue) g = apply(g, tongue);
    if (face.yawn) g = apply(g, yawnMouth);
    if (face.phones) g = apply(g, headphones);
    if (face.knead) g = apply(g, tick % 2 ? kneadLeft : kneadRight);
    // Dog tails never stop.
    if (tick % 2) g = apply(g, tailUp);
    if (level > 0 && !face.phones) g = apply(g, ACCESSORIES[Math.min(level, 3)]);
    return g;
  }, [face, gaze.x, tick, level]);

  const palette = face.hot ? HOT_PALETTE : BASE_PALETTE;

  const body: Variants = {
    idle: { y: [0, -2, 0], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
    petting: { rotate: [-3, 3, -3], transition: { duration: 0.4, repeat: Infinity } },
    sleeping: { y: 4, scaleY: 0.94, transition: { duration: 1 } },
    waking: { scaleY: [0.94, 1.22, 1.05, 1], scaleX: [1, 0.9, 0.97, 1], y: [4, -6, 0, 0], transition: { duration: 2.4 } },
    playing: { rotate: [-4, 4, -4], y: [0, -4, 0], transition: { duration: 0.35, repeat: Infinity } },
    typing: { y: [0, -1.5, 0], transition: { duration: 0.22, repeat: Infinity } },
    overheat: { x: [-1.5, 1.5, -1.5], transition: { duration: 0.12, repeat: Infinity } },
    hunting: { x: [-5, 5, -5], y: [0, -4, 0], transition: { duration: 0.3, repeat: Infinity } },
    stretching: { scaleY: [1, 1.28, 1.28, 1], scaleX: [1, 0.92, 0.92, 1], transition: { duration: 2.4, repeat: Infinity } },
    "ai-sync": { y: [0, -4, 0], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
    celebrating: { y: [0, -24, 0, -16, 0], transition: { duration: 0.7, repeat: Infinity } },
    grumpy: { x: [-2, 2, -2], transition: { duration: 0.18, repeat: Infinity } },
    vibing: { rotate: [-5, 5, -5], y: [0, -2, 0], transition: { duration: 0.6, repeat: Infinity } },
  };
  const variant = (body[state as string] ? state : "idle") as string;

  return (
    <div className="relative h-full w-full">
      <PixelStage
        rows={rows}
        palette={palette}
        width={W}
        flat={FLAT}
        shadow={state === "celebrating" || state === "hunting" ? 0.55 : 1}
        variants={body}
        animate={variant}
      />
      <DogOverlays state={state} />
    </div>
  );
}

function DogOverlays({ state }: { state: CompanionState }) {
  const floaters: Record<string, { items: string[]; cls: string }> = {
    petting: { items: ["💗", "💕"], cls: "text-base" },
    overheat: { items: ["💨", "♨️"], cls: "text-base" },
    hunting: { items: ["❗"], cls: "text-lg" },
    waking: { items: ["🥱"], cls: "text-lg" },
    playing: { items: ["🎾"], cls: "text-lg" },
    grumpy: { items: ["💢"], cls: "text-lg" },
    "ai-sync": { items: ["✦", "✧"], cls: "text-base text-violet-300" },
    coding: { items: ["</>", "{ }"], cls: "font-mono text-xs font-bold text-emerald-300" },
    vibing: { items: ["♪", "♫"], cls: "text-lg text-pink-300" },
    watching: { items: ["🍿"], cls: "text-lg" },
    gaming: { items: ["🎮"], cls: "text-lg" },
    chatting: { items: ["💬"], cls: "text-base" },
    designing: { items: ["🎨"], cls: "text-base" },
    writing: { items: ["✍️"], cls: "text-base" },
    browsing: { items: ["🔍"], cls: "text-base" },
    stretching: { items: ["🧘"], cls: "text-base" },
    celebrating: { items: ["🎉", "✨", "⭐"], cls: "text-base" },
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

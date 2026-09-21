import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useCompanionStore } from "../state/companionStore";
import type { CompanionState } from "../integrations/types";

/**
 * Mochi — the default mascot. A chubby cream tabby drawn in pure SVG with a
 * different face for everything you do: petting, typing, AI thinking, vibe
 * coding, music, movies, games, chats… Eyes follow your real cursor.
 */

type Eyes = "open" | "happy" | "closed" | "focused" | "starry" | "wide";
type Mouth = "cat" | "open" | "flat" | "ooo";

const FACES: Record<string, { eyes: Eyes; mouth: Mouth }> = {
  idle: { eyes: "open", mouth: "cat" },
  petting: { eyes: "happy", mouth: "open" },
  sleeping: { eyes: "closed", mouth: "flat" },
  typing: { eyes: "focused", mouth: "cat" },
  "ai-sync": { eyes: "wide", mouth: "ooo" },
  coding: { eyes: "focused", mouth: "cat" },
  celebrating: { eyes: "starry", mouth: "open" },
  vibing: { eyes: "happy", mouth: "cat" },
  browsing: { eyes: "wide", mouth: "cat" },
  watching: { eyes: "wide", mouth: "ooo" },
  gaming: { eyes: "focused", mouth: "cat" },
  chatting: { eyes: "open", mouth: "open" },
  designing: { eyes: "open", mouth: "cat" },
  writing: { eyes: "focused", mouth: "cat" },
};

export default function MochiCat({ state }: { state: CompanionState }) {
  const gaze = useCompanionStore((s) => s.gaze);
  const face = FACES[state as string] ?? FACES.idle;
  const px = face.eyes === "closed" || face.eyes === "happy" ? 0 : gaze.x * 5;
  const py = face.eyes === "closed" || face.eyes === "happy" ? 0 : gaze.y * 4;

  const body: Variants = {
    idle: { y: [0, -4, 0], rotate: 0, scaleY: 1, transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } },
    petting: { y: 0, rotate: [-2, 2, -2], scaleY: [1, 0.96, 1], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
    sleeping: { y: 10, scaleY: 0.9, rotate: 0, transition: { duration: 1.2, ease: "easeOut" } },
    typing: { y: [0, -2.5, 0], rotate: 0, scaleY: 1, transition: { duration: 0.3, repeat: Infinity } },
    "ai-sync": { y: [0, -8, 0], rotate: 0, scaleY: 1, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
    coding: { y: [0, -3, 0], rotate: 0, scaleY: 1, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
    celebrating: { y: [0, -24, 0, -14, 0], rotate: [0, -5, 5, -3, 0], scaleY: 1, transition: { duration: 0.9, repeat: Infinity } },
    vibing: { rotate: [-5, 5, -5], y: [0, -3, 0], scaleY: 1, transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" } },
    watching: { y: [0, -1.5, 0], rotate: 0, scaleY: 1, transition: { duration: 2.6, repeat: Infinity } },
    gaming: { y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0], scaleY: 1, transition: { duration: 0.5, repeat: Infinity } },
    chatting: { y: [0, -3, 0], rotate: [0, 2, 0], scaleY: 1, transition: { duration: 1.2, repeat: Infinity } },
  };
  const variant = (body[state as string] ? state : "idle") as string;

  const glow =
    state === "ai-sync" ? "#c4b5fd"
    : state === "celebrating" ? "#fdba74"
    : state === "petting" ? "#f9a8d4"
    : "#fde68a";

  return (
    <div className="relative h-full w-full">
      <motion.div
        className="absolute inset-8 rounded-full blur-2xl"
        animate={{ opacity: state === "sleeping" ? 0.12 : [0.2, 0.45, 0.2], backgroundColor: glow }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />

      <motion.svg viewBox="0 0 200 200" className="relative h-full w-full drop-shadow-xl" variants={body} animate={variant}>
        <defs>
          <linearGradient id="catFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
        </defs>

        {/* Tail — always swishing */}
        <motion.path
          d="M150 140 Q184 138 178 108 Q174 92 158 100"
          fill="none"
          stroke="#fb923c"
          strokeWidth="14"
          strokeLinecap="round"
          animate={{ rotate: state === "sleeping" ? [0, 2, 0] : [0, 10, 0] }}
          transition={{ duration: state === "vibing" ? 0.7 : 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "150px", originY: "140px" }}
        />

        {/* Ears (they twitch) */}
        <motion.path
          d="M56 74 L48 36 L88 56 Z"
          fill="url(#catFur)"
          animate={{ rotate: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 1.2 }}
          style={{ originX: "68px", originY: "66px" }}
        />
        <motion.path
          d="M144 74 L152 36 L112 56 Z"
          fill="url(#catFur)"
          animate={{ rotate: [0, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          style={{ originX: "132px", originY: "66px" }}
        />
        <path d="M58 66 L54 44 L78 56 Z" fill="#f9a8d4" opacity="0.8" />
        <path d="M142 66 L146 44 L122 56 Z" fill="#f9a8d4" opacity="0.8" />

        {/* Chibi head-body blob + belly */}
        <ellipse cx="100" cy="118" rx="58" ry="54" fill="url(#catFur)" />
        <ellipse cx="100" cy="140" rx="34" ry="26" fill="#ffedd5" />

        {/* Tabby stripes */}
        <path d="M88 62 Q90 70 88 76" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M100 60 Q102 69 100 76" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M112 62 Q114 70 112 76" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Eyes */}
        <CatEyes kind={face.eyes} px={px} py={py} />

        {/* Blush + nose + mouth + whiskers */}
        <ellipse cx="62" cy="120" rx="8" ry="5" fill="#f9a8d4" opacity="0.75" />
        <ellipse cx="138" cy="120" rx="8" ry="5" fill="#f9a8d4" opacity="0.75" />
        <path d="M96 118 L104 118 L100 124 Z" fill="#f472b6" />
        <CatMouth kind={face.mouth} />
        <g stroke="#fb923c" strokeWidth="2" strokeLinecap="round" opacity="0.9">
          <path d="M52 112 L30 108" /><path d="M52 120 L28 120" /><path d="M52 128 L30 132" />
          <path d="M148 112 L170 108" /><path d="M148 120 L172 120" /><path d="M148 128 L170 132" />
        </g>

        {/* Front paws — they tap while typing */}
        <motion.ellipse
          cx="80" cy="166" rx="13" ry="8" fill="#fed7aa" stroke="#fb923c" strokeWidth="2"
          animate={state === "typing" ? { y: [0, -6, 0] } : { y: 0 }}
          transition={{ duration: 0.24, repeat: Infinity }}
        />
        <motion.ellipse
          cx="120" cy="166" rx="13" ry="8" fill="#fed7aa" stroke="#fb923c" strokeWidth="2"
          animate={state === "typing" ? { y: [-6, 0, -6] } : { y: 0 }}
          transition={{ duration: 0.24, repeat: Infinity }}
        />

        {/* Accessories */}
        {(state === "coding" || state === "writing") && (
          <g fill="none" stroke="#334155" strokeWidth="3.5">
            <circle cx="78" cy="104" r="17" /><circle cx="122" cy="104" r="17" />
            <path d="M95 104 L105 104" /><path d="M61 100 L48 94" /><path d="M139 100 L152 94" />
          </g>
        )}
        {(state === "vibing" || state === "gaming") && (
          <g>
            <path d="M52 96 Q100 40 148 96" fill="none" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
            <rect x="42" y="92" width="16" height="26" rx="7" fill="#334155" />
            <rect x="142" y="92" width="16" height="26" rx="7" fill="#334155" />
          </g>
        )}
        {state === "ai-sync" && (
          <g>
            <circle cx="150" cy="58" r="4" fill="white" opacity="0.9" />
            <circle cx="160" cy="44" r="6" fill="white" opacity="0.9" />
            <rect x="164" y="10" width="34" height="24" rx="12" fill="white" opacity="0.95" />
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i} cx={173 + i * 8} cy="22" r="2.6" fill="#7c3aed"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </g>
        )}
      </motion.svg>

      <StateOverlays state={state} />
    </div>
  );
}

function CatEyes({ kind, px, py }: { kind: Eyes; px: number; py: number }) {
  if (kind === "closed")
    return (
      <g stroke="#431407" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M70 106 Q78 112 86 106" /><path d="M114 106 Q122 112 130 106" />
      </g>
    );
  if (kind === "happy")
    return (
      <g stroke="#431407" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M68 106 Q78 96 88 106" /><path d="M112 106 Q122 96 132 106" />
      </g>
    );
  if (kind === "starry")
    return (
      <g fill="#fbbf24">
        <motion.path
          d="M78 92 L82 102 L92 104 L82 108 L78 118 L74 108 L64 104 L74 102 Z"
          animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.5, repeat: Infinity }}
          style={{ originX: "78px", originY: "104px" }}
        />
        <motion.path
          d="M122 92 L126 102 L136 104 L126 108 L122 118 L118 108 L108 104 L118 102 Z"
          animate={{ scale: [1.25, 1, 1.25] }} transition={{ duration: 0.5, repeat: Infinity }}
          style={{ originX: "122px", originY: "104px" }}
        />
      </g>
    );

  const r = kind === "wide" ? 14 : 12;
  const lid = kind === "focused";
  return (
    <g>
      <circle cx="78" cy="104" r={r} fill="white" />
      <circle cx="122" cy="104" r={r} fill="white" />
      {/* Blink every few seconds */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.08, 1] }}
        transition={{ duration: 4.5, times: [0, 0.92, 0.96, 1], repeat: Infinity }}
        style={{ originY: "104px" }}
      >
        <motion.g animate={{ x: px, y: py }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <circle cx="78" cy="104" r="6.5" fill="#431407" />
          <circle cx="122" cy="104" r="6.5" fill="#431407" />
          <circle cx="80.5" cy="101.5" r="2.2" fill="white" />
          <circle cx="124.5" cy="101.5" r="2.2" fill="white" />
        </motion.g>
      </motion.g>
      {lid && (
        <g fill="url(#catFur)">
          <rect x="62" y="88" width="32" height="9" rx="4" />
          <rect x="106" y="88" width="32" height="9" rx="4" />
        </g>
      )}
    </g>
  );
}

function CatMouth({ kind }: { kind: Mouth }) {
  if (kind === "open") return <ellipse cx="100" cy="132" rx="6.5" ry="5.5" fill="#7f1d1d" />;
  if (kind === "ooo") return <circle cx="100" cy="131" r="4" fill="#7f1d1d" />;
  if (kind === "flat")
    return <path d="M94 130 L106 130" stroke="#431407" strokeWidth="3" strokeLinecap="round" fill="none" />;
  // classic cat "w"
  return (
    <path d="M92 127 Q96 133 100 127 Q104 133 108 127" stroke="#431407" strokeWidth="3" strokeLinecap="round" fill="none" />
  );
}

/** Floating props per state. */
function StateOverlays({ state }: { state: CompanionState }) {
  const floaters: Record<string, { items: string[]; className: string }> = {
    petting: { items: ["💗", "💕", "💗"], className: "text-lg" },
    "ai-sync": { items: ["✦", "✧", "✦"], className: "text-lg text-violet-300" },
    coding: { items: ["</>", "{ }", "( )"], className: "font-mono text-sm font-bold text-emerald-300" },
    vibing: { items: ["♪", "♫", "♪"], className: "text-xl text-pink-300" },
    watching: { items: ["🍿"], className: "text-xl" },
    gaming: { items: ["🎮"], className: "text-xl" },
    chatting: { items: ["💬", "💭"], className: "text-lg" },
    designing: { items: ["🎨", "✨"], className: "text-lg" },
    writing: { items: ["✍️"], className: "text-lg" },
    browsing: { items: ["🔍"], className: "text-lg" },
    celebrating: { items: ["🎉", "✨", "⭐", "🎊", "✨"], className: "text-lg" },
  };

  return (
    <AnimatePresence>
      {state === "sleeping" && (
        <motion.div key="zzz" className="absolute right-5 top-3" exit={{ opacity: 0 }}>
          {["z", "z", "Z"].map((z, i) => (
            <motion.span
              key={i}
              className="absolute font-bold text-amber-400"
              style={{ right: i * 14, fontSize: 14 + i * 6 }}
              animate={{ y: [0, -18], opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
            >
              {z}
            </motion.span>
          ))}
        </motion.div>
      )}

      {floaters[state as string] && (
        <motion.div key={state as string} className="absolute inset-0" exit={{ opacity: 0 }}>
          {floaters[state as string].items.map((item, i) => (
            <motion.span
              key={i}
              className={`absolute ${floaters[state as string].className}`}
              style={{ left: `${16 + i * (68 / Math.max(1, floaters[state as string].items.length - 1) || 0)}%`, top: "4%" }}
              animate={
                state === "celebrating"
                  ? { y: [0, 60], opacity: [1, 0], rotate: [0, i % 2 ? 150 : -150] }
                  : { y: [0, -14, 0], opacity: [0.3, 1, 0.3] }
              }
              transition={{ duration: state === "celebrating" ? 1.1 : 1.6, repeat: Infinity, delay: i * 0.3 }}
            >
              {item}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

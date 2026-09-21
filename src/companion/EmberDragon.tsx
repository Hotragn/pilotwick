import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useCompanionStore } from "../state/companionStore";
import type { CompanionState } from "../integrations/types";

/**
 * Pilotwick — the default mascot. A cute holographic dragon drawn in pure SVG so
 * it stays crisp at any size and weighs zero kilobytes of assets.
 * Every state is a framer-motion variant; the eyes track the real cursor.
 */
export default function EmberDragon({ state }: { state: CompanionState }) {
  const gaze = useCompanionStore((s) => s.gaze);
  const asleep = state === "sleeping";
  // Pupils glance toward the cursor (max ±5px).
  const px = asleep ? 0 : gaze.x * 5;
  const py = asleep ? 0 : gaze.y * 4;

  const body: Variants = {
    idle: { y: [0, -6, 0], rotate: 0, transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } },
    sleeping: { y: 8, scaleY: 0.92, rotate: 0, transition: { duration: 1.2, ease: "easeOut" } },
    typing: { y: [0, -3, 0], rotate: [0, -1.5, 1.5, 0], transition: { duration: 0.35, repeat: Infinity } },
    "ai-sync": { y: [0, -10, 0], rotate: 0, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
    coding: { y: [0, -4, 0], rotate: 0, transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } },
    celebrating: { y: [0, -26, 0, -18, 0], rotate: [0, -6, 6, -4, 0], transition: { duration: 0.9, repeat: Infinity } },
    vibing: { rotate: [-4, 4, -4], y: [0, -4, 0], transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" } },
  };

  const wing: Variants = {
    idle: { rotate: [0, 8, 0], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } },
    sleeping: { rotate: 2 },
    typing: { rotate: [0, 22, 0], transition: { duration: 0.25, repeat: Infinity } },
    "ai-sync": { rotate: [0, 14, 0], transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } },
    coding: { rotate: [0, 10, 0], transition: { duration: 1.6, repeat: Infinity } },
    celebrating: { rotate: [0, 35, 0], transition: { duration: 0.3, repeat: Infinity } },
    vibing: { rotate: [0, 18, 0], transition: { duration: 0.8, repeat: Infinity } },
  };

  const variant = (body[state as string] ? state : "idle") as string;
  const glowColor =
    state === "ai-sync" ? "#a78bfa" : state === "celebrating" ? "#fb923c" : "#2dd4bf";

  return (
    <div className="relative h-full w-full">
      {/* Soft holographic glow under the dragon */}
      <motion.div
        className="absolute inset-6 rounded-full blur-2xl"
        animate={{ opacity: state === "sleeping" ? 0.15 : [0.25, 0.5, 0.25], backgroundColor: glowColor }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <motion.svg viewBox="0 0 200 200" className="relative h-full w-full drop-shadow-xl" variants={body} animate={variant}>
        <defs>
          <linearGradient id="dragonSkin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Tail with ember tip */}
        <motion.path
          d="M52 138 Q18 150 22 122 Q25 106 42 112"
          fill="none"
          stroke="url(#dragonSkin)"
          strokeWidth="14"
          strokeLinecap="round"
          animate={{ rotate: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "52px", originY: "138px" }}
        />
        <circle cx="22" cy="120" r="9" fill="url(#flame)" opacity="0.9" />

        {/* Wings */}
        <motion.path
          d="M46 96 Q18 74 30 52 Q52 62 58 88 Z"
          fill="url(#dragonSkin)"
          opacity="0.85"
          variants={wing}
          style={{ originX: "58px", originY: "92px" }}
        />
        <motion.path
          d="M154 96 Q182 74 170 52 Q148 62 142 88 Z"
          fill="url(#dragonSkin)"
          opacity="0.85"
          variants={wing}
          style={{ originX: "142px", originY: "92px", scaleX: -1 }}
        />

        {/* Chibi body/head */}
        <ellipse cx="100" cy="116" rx="54" ry="50" fill="url(#dragonSkin)" />
        <ellipse cx="100" cy="132" rx="34" ry="26" fill="#ccfbf1" opacity="0.9" />

        {/* Horns + back spikes */}
        <path d="M74 72 Q70 54 82 58 Q84 68 80 74 Z" fill="#fcd34d" />
        <path d="M126 72 Q130 54 118 58 Q116 68 120 74 Z" fill="#fcd34d" />
        <path d="M96 64 L100 52 L104 64 Z" fill="#fcd34d" />

        {/* Eyes — they follow your cursor */}
        {asleep ? (
          <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M72 104 Q80 110 88 104" />
            <path d="M112 104 Q120 110 128 104" />
          </g>
        ) : (
          <g>
            <circle cx="80" cy="102" r="13" fill="white" />
            <circle cx="120" cy="102" r="13" fill="white" />
            <motion.g animate={{ x: px, y: py }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
              <circle cx="80" cy="102" r="6" fill="#0f172a" />
              <circle cx="120" cy="102" r="6" fill="#0f172a" />
              <circle cx="82.5" cy="99.5" r="2" fill="white" />
              <circle cx="122.5" cy="99.5" r="2" fill="white" />
            </motion.g>
          </g>
        )}

        {/* Cheeks, nostrils, mouth */}
        <ellipse cx="66" cy="118" rx="7" ry="4.5" fill="#f9a8d4" opacity="0.8" />
        <ellipse cx="134" cy="118" rx="7" ry="4.5" fill="#f9a8d4" opacity="0.8" />
        <circle cx="94" cy="120" r="1.8" fill="#0f172a" />
        <circle cx="106" cy="120" r="1.8" fill="#0f172a" />
        {state === "celebrating" ? (
          <ellipse cx="100" cy="130" rx="7" ry="6" fill="#7f1d1d" />
        ) : (
          <path d="M92 128 Q100 135 108 128" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Fire breath 🔥 (celebration only) */}
        <AnimatePresence>
          {state === "celebrating" && (
            <motion.g
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0.8, 1, 0.8], scale: [0.8, 1.15, 0.8] }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.4, repeat: Infinity }}
              style={{ originX: "100px", originY: "136px" }}
            >
              <path d="M100 136 Q112 158 100 178 Q88 158 100 136" fill="url(#flame)" />
              <path d="M100 142 Q107 156 100 168 Q93 156 100 142" fill="#fde047" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Tiny feet */}
        <ellipse cx="78" cy="164" rx="12" ry="7" fill="#7c3aed" opacity="0.9" />
        <ellipse cx="122" cy="164" rx="12" ry="7" fill="#7c3aed" opacity="0.9" />
      </motion.svg>

      <StateOverlays state={state} />
    </div>
  );
}

/** Floating props per state: 💤 / ✦ sparkles / code brackets / music notes / confetti. */
function StateOverlays({ state }: { state: CompanionState }) {
  return (
    <AnimatePresence>
      {state === "sleeping" && (
        <motion.div key="zzz" className="absolute right-4 top-2 text-2xl" exit={{ opacity: 0 }}>
          {["z", "z", "Z"].map((z, i) => (
            <motion.span
              key={i}
              className="absolute font-bold text-teal-300"
              style={{ right: i * 14, fontSize: 14 + i * 6 }}
              animate={{ y: [0, -18], opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
            >
              {z}
            </motion.span>
          ))}
        </motion.div>
      )}

      {state === "ai-sync" && (
        <motion.div key="ai" className="absolute inset-0" exit={{ opacity: 0 }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute text-lg text-violet-300"
              style={{ left: `${18 + i * 20}%`, top: "8%" }}
              animate={{ y: [0, -12, 0], opacity: [0.3, 1, 0.3], rotate: [0, 180] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
            >
              ✦
            </motion.span>
          ))}
        </motion.div>
      )}

      {state === "coding" && (
        <motion.div key="code" className="absolute inset-x-0 top-1 flex justify-center gap-3" exit={{ opacity: 0 }}>
          {["</>", "{ }", "( )"].map((s, i) => (
            <motion.span
              key={s}
              className="font-mono text-sm font-bold text-emerald-300"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}
            >
              {s}
            </motion.span>
          ))}
        </motion.div>
      )}

      {state === "vibing" && (
        <motion.div key="vibe" className="absolute inset-x-0 top-1 flex justify-center gap-4" exit={{ opacity: 0 }}>
          {["♪", "♫", "♪"].map((n, i) => (
            <motion.span
              key={i}
              className="text-xl text-pink-300"
              animate={{ y: [0, -14], opacity: [0, 1, 0], rotate: [0, i % 2 ? 20 : -20] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
            >
              {n}
            </motion.span>
          ))}
        </motion.div>
      )}

      {state === "celebrating" && (
        <motion.div key="confetti" className="absolute inset-0" exit={{ opacity: 0 }}>
          {["🎉", "✨", "🔥", "⭐", "✨"].map((c, i) => (
            <motion.span
              key={i}
              className="absolute text-lg"
              style={{ left: `${10 + i * 18}%`, top: "4%" }}
              animate={{ y: [0, 60], opacity: [1, 0], rotate: [0, i % 2 ? 160 : -160] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            >
              {c}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

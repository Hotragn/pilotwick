import { motion } from "framer-motion";
import type { WeatherNow } from "../state/weather";

/**
 * Ambient weather around the pet: rain streaks, drifting snow, a blazing sun
 * or a frosty shiver. Purely decorative — sits behind the mascot.
 */
export default function WeatherEffects({ weather }: { weather: WeatherNow }) {
  const { kind } = weather;

  if (kind === "rain") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-0.5 rounded bg-sky-400/70"
            style={{ left: `${8 + i * 13}%`, height: 10 }}
            animate={{ y: [-12, 200], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.17, ease: "linear" }}
          />
        ))}
      </div>
    );
  }

  if (kind === "snow" || kind === "cold") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: kind === "snow" ? 6 : 3 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-xs text-sky-100"
            style={{ left: `${10 + i * 16}%` }}
            animate={{ y: [-10, 190], x: [0, i % 2 ? 10 : -10, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
          >
            ❄
          </motion.span>
        ))}
      </div>
    );
  }

  if (kind === "hot") {
    return (
      <motion.span
        className="pointer-events-none absolute right-1 top-0 text-xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 12, 0] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        🌞
      </motion.span>
    );
  }

  return null; // clear / clouds: no ambience needed
}

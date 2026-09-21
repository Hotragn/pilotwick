import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MascotView, { BUILTIN_MASCOTS } from "../companion/MascotView";
import { setMascot, useMascot, type BuiltinMascot } from "../profiles/mascotChoice";
import { useProfile } from "../profiles/profileManager";
import { STATE_INFO } from "../profiles/profileSchema";
import { Button, Card, PanelHeader } from "./ui";

/**
 * The mascot gallery.
 *
 * Choosing a companion used to mean reading four text labels and guessing.
 * Here every card renders the real, animating mascot, and the stage plays
 * back any mood on demand — so you pick what you actually saw.
 */

/** The moods worth showing off, in the order they tell the best story. */
const SHOWCASE = [
  "idle",
  "typing",
  "ai-sync",
  "celebrating",
  "petting",
  "vibing",
  "sleeping",
  "grumpy",
] as const;

const STATE_LABEL = new Map(STATE_INFO.map((s) => [s.id as string, s]));
const CYCLE_MS = 2600;

export default function MascotPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const active = useMascot();
  const { profile } = useProfile();
  const [preview, setPreview] = useState<BuiltinMascot>(active);
  const [stateIndex, setStateIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Follow the real selection when it changes elsewhere (e.g. after Apply).
  useEffect(() => setPreview(active), [active]);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setStateIndex((i) => (i + 1) % SHOWCASE.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [autoplay]);

  const shown = SHOWCASE[stateIndex];
  const info = STATE_LABEL.get(shown);

  const cards: { id: BuiltinMascot; name: string; tagline: string; accent: string }[] = [
    ...BUILTIN_MASCOTS,
    ...(profile
      ? [
          {
            id: "custom" as BuiltinMascot,
            name: profile.meta.name,
            tagline: profile.meta.author ? `by ${profile.meta.author}` : "your own artwork",
            accent: "#facc15",
          },
        ]
      : []),
  ];

  return (
    <div>
      <PanelHeader
        title="Your companion"
        blurb="Pick a mascot, watch it react, then send it to your desktop."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* ── Live stage ─────────────────────────────────────────────── */}
        <Card>
          <div className="relative flex h-[240px] items-end justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_18%,#1e293b,#020617_72%)]">
            {/* A faint desk line so the pet reads as standing on something. */}
            <div className="absolute inset-x-6 bottom-9 h-px bg-slate-700/60" />
            <motion.div
              key={`${preview}-${shown}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="relative mb-4 h-[190px] w-[190px]"
            >
              <MascotView mascot={preview} state={shown} profile={profile} />
            </motion.div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              <span className="font-bold text-slate-100">{info?.emoji} {info?.name}</span>
              {info?.hint ? ` — ${info.hint}` : ""}
            </p>
            <button
              onClick={() => setAutoplay((a) => !a)}
              title={autoplay ? "Pause the mood cycle" : "Cycle through moods"}
              className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
            >
              {autoplay ? "⏸ Pause" : "▶ Play"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SHOWCASE.map((id, i) => (
              <button
                key={id}
                onClick={() => {
                  setAutoplay(false);
                  setStateIndex(i);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  i === stateIndex
                    ? "bg-teal-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {STATE_LABEL.get(id)?.emoji} {STATE_LABEL.get(id)?.name}
              </button>
            ))}
          </div>

          {preview !== active && (
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={async () => {
                  await setMascot(preview);
                  onFlash(`${cards.find((c) => c.id === preview)?.name} is now your companion`);
                }}
              >
                Use this companion
              </Button>
            </div>
          )}
        </Card>

        {/* ── Gallery ────────────────────────────────────────────────── */}
        <Card
          title="Gallery"
          blurb="Every card is the live mascot, not a screenshot. Click to preview, double-click to apply."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((m) => {
              const isActive = active === m.id;
              const isPreview = preview === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setPreview(m.id)}
                  onDoubleClick={async () => {
                    await setMascot(m.id);
                    onFlash(`${m.name} is now your companion`);
                  }}
                  className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-colors ${
                    isPreview
                      ? "border-teal-400 bg-teal-950/30"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-2 top-2 rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950">
                      Active
                    </span>
                  )}
                  <div
                    className="mx-auto h-24 w-24"
                    style={{ filter: `drop-shadow(0 6px 12px ${m.accent}33)` }}
                  >
                    <MascotView mascot={m.id} state="idle" profile={profile} />
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-100">{m.name}</p>
                  {/* Two lines: the gallery is three-across in a 1040px
                      window, where one line clips most taglines. */}
                  <p className="line-clamp-2 text-[11px] leading-snug text-slate-400">
                    {m.tagline}
                  </p>
                </button>
              );
            })}

            {/* Always-present nudge toward making one. */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-3 text-center">
              <span className="text-2xl">🎨</span>
              <p className="mt-1 text-sm font-bold text-slate-200">Make your own</p>
              <p className="text-[11px] leading-snug text-slate-500">
                Upload GIFs or a sprite sheet in Custom art.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

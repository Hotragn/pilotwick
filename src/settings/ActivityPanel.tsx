import { useEffect, useState } from "react";
import { clearAllStats, formatMinutes, loadRecent, loadToday, type DayEntry, type DayStats } from "../state/stats";
import { EVOLUTION_TIERS, useEvolution } from "../state/wellness";
import { Button, Card, PanelHeader, Stat } from "./ui";

/**
 * "Where did today go?" — built entirely from what the companion already
 * senses, stored only on this machine. No account, no upload, no dashboard
 * in someone else's cloud.
 */

/** Which states roll up into which headline number. */
const BUCKETS: { label: string; states: string[]; color: string }[] = [
  { label: "Coding", states: ["coding", "typing", "overheat"], color: "#2dd4bf" },
  { label: "AI", states: ["ai-sync"], color: "#a78bfa" },
  { label: "Browsing", states: ["browsing", "writing", "designing"], color: "#60a5fa" },
  { label: "Music & video", states: ["vibing", "watching"], color: "#f472b6" },
  { label: "Gaming & chat", states: ["gaming", "chatting"], color: "#fbbf24" },
  { label: "Idle & naps", states: ["idle", "sleeping", "waking"], color: "#475569" },
];

const bucketMs = (stats: DayStats, states: string[]) =>
  states.reduce((sum, s) => sum + (stats.stateMs[s] ?? 0), 0);

/** Everything except idling — the honest "active at the machine" figure. */
const activeMs = (stats: DayStats) =>
  Object.entries(stats.stateMs)
    .filter(([state]) => !["idle", "sleeping", "waking"].includes(state))
    .reduce((sum, [, ms]) => sum + ms, 0);

export default function ActivityPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const [today, setToday] = useState<DayStats>(loadToday);
  const [week, setWeek] = useState<DayEntry[]>(() => loadRecent(7));
  const { count, level } = useEvolution();

  // The overlay window writes stats continuously; poll for display.
  useEffect(() => {
    const id = setInterval(() => {
      setToday(loadToday());
      setWeek(loadRecent(7));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const total = activeMs(today);
  // The bars include the idle bucket, so they are normalised against the full
  // recorded day — dividing by active time alone would push idle past 100%.
  const recorded = Math.max(
    1,
    BUCKETS.reduce((sum, b) => sum + bucketMs(today, b.states), 0)
  );
  const peak = Math.max(1, ...week.map((d) => activeMs(d.stats)));
  const weekTotal = week.reduce((sum, d) => sum + activeMs(d.stats), 0);

  return (
    <div>
      <PanelHeader
        title="Activity"
        blurb="What your companion watched you do. Stored on this machine only — nothing is ever uploaded."
      />

      <div className="space-y-5">
        <Card title="Today">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={formatMinutes(total)} label="Active time" />
            <Stat value={formatMinutes(bucketMs(today, ["coding", "typing", "overheat"]))} label="Coding" />
            <Stat value={String(today.aiSessions)} label="AI tasks done" />
            <Stat value={String(today.commits)} label="Commits" />
          </div>

          <div className="mt-5 space-y-2">
            {BUCKETS.map((b) => {
              const ms = bucketMs(today, b.states);
              if (ms === 0) return null;
              return (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-400">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(2, (ms / recorded) * 100)}%`,
                        background: b.color,
                      }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs text-slate-300">
                    {formatMinutes(ms)}
                  </span>
                </div>
              );
            })}
            {total === 0 && (
              <p className="text-sm text-slate-500">
                Nothing recorded yet today — the companion starts counting as soon as it is
                running alongside you.
              </p>
            )}
          </div>
        </Card>

        <Card title="Last 7 days" blurb={`${formatMinutes(weekTotal)} of active time this week.`}>
          <div className="flex h-36 items-end justify-between gap-2">
            {week.map((d) => {
              const ms = activeMs(d.stats);
              return (
                <div key={d.id} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-500">
                    {ms > 0 ? formatMinutes(ms) : ""}
                  </span>
                  {/* The bar's percentage height needs a parent of definite
                      height to resolve against, hence this plot area. */}
                  <div className="flex w-full flex-1 items-end">
                    <div
                      title={`${d.id}: ${formatMinutes(ms)}`}
                      className="w-full rounded-t-md bg-gradient-to-t from-teal-700 to-teal-400 transition-all"
                      style={{ height: `${Math.max(2, (ms / peak) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{d.short}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Companion evolution"
          blurb="Completed focus sessions earn accessories your pet wears on screen."
          action={
            <Button
              variant="danger"
              onClick={() => {
                clearAllStats();
                setToday(loadToday());
                setWeek(loadRecent(7));
                onFlash("Activity history cleared");
              }}
            >
              Clear history
            </Button>
          }
        >
          <p className="mb-3 text-sm text-slate-300">
            <span className="font-bold text-teal-300">{count}</span> focus session
            {count === 1 ? "" : "s"} completed.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {EVOLUTION_TIERS.map((tier, i) => (
              <div
                key={tier.at}
                className={`rounded-xl border px-3 py-3 text-center ${
                  level > i
                    ? "border-amber-400/60 bg-amber-950/30 text-amber-200"
                    : "border-slate-800 bg-slate-950/60 text-slate-500"
                }`}
              >
                <span className="text-xl">{tier.emoji}</span>
                <p className="mt-1 text-xs font-bold">{tier.name}</p>
                <p className="text-[11px]">
                  {level > i ? "Unlocked" : `${tier.at} sessions`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

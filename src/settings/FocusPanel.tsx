import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  formatCountdown,
  loadPomodoro,
  saveConfig,
  startPomodoro,
  stopPomodoro,
  useWellnessConfig,
  type PomodoroState,
} from "../state/wellness";
import { Button, Card, Field, inputClass, PanelHeader } from "./ui";

/**
 * Focus & care — the timer, the stretch nudge, and what the companion
 * should call you. Everything here shows up next to the pet, not in a
 * window you have to keep open.
 */

const PRESETS = [
  { name: "Classic", focus: 25, brk: 5 },
  { name: "Deep work", focus: 50, brk: 10 },
  { name: "Sprint", focus: 15, brk: 3 },
] as const;

export default function FocusPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const saved = useWellnessConfig();
  const [draft, setDraft] = useState(saved);
  const [pomodoro, setPomodoro] = useState<PomodoroState>(loadPomodoro);
  const [, tick] = useState(0);

  useEffect(() => setDraft(saved), [saved]);

  useEffect(() => {
    const un = listen("companion://wellness-updated", () => setPomodoro(loadPomodoro()));
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  // Keep the live countdown ticking while this panel is open.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = pomodoro.running ? Math.max(0, pomodoro.endsAt - Date.now()) : 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const persist = async (next = draft) => {
    await saveConfig(next);
    setDraft(next);
  };

  return (
    <div>
      <PanelHeader
        title="Focus & care"
        blurb="Pomodoro sessions, stretch nudges, and a note your companion holds up for you."
      />

      <div className="space-y-5">
        <Card title="Focus timer" blurb="The countdown floats beside the pet while it runs.">
          {pomodoro.running ? (
            <div className="flex items-center gap-5">
              <div
                className={`rounded-2xl border px-6 py-4 text-center ${
                  pomodoro.phase === "focus"
                    ? "border-rose-500/50 bg-rose-950/40"
                    : "border-emerald-500/50 bg-emerald-950/40"
                }`}
              >
                <p className="font-mono text-3xl font-bold text-slate-50">
                  {formatCountdown(remaining)}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">
                  {pomodoro.phase === "focus" ? "🎯 Focusing" : "☕ Break"}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={async () => {
                  await stopPomodoro();
                  setPomodoro(loadPomodoro());
                  onFlash("Focus session stopped");
                }}
              >
                Stop session
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <Field label="Focus (min)">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={draft.focusMin}
                      onChange={(e) => setDraft({ ...draft, focusMin: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="w-32">
                  <Field label="Break (min)">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={draft.breakMin}
                      onChange={(e) => setDraft({ ...draft, breakMin: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Button
                  variant="primary"
                  onClick={async () => {
                    await persist();
                    await startPomodoro(draft);
                    setPomodoro(loadPomodoro());
                    onFlash("Focus session started");
                  }}
                >
                  Start session
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => persist({ ...draft, focusMin: preset.focus, breakMin: preset.brk })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      draft.focusMin === preset.focus && draft.breakMin === preset.brk
                        ? "border-teal-400 bg-teal-950/40 text-teal-200"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {preset.name} · {preset.focus}/{preset.brk}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Care" blurb="Small things that make the pet feel like it is looking after you.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" hint="It will greet you and use this in reminders.">
              <input
                value={draft.name}
                placeholder="e.g. Harsha"
                maxLength={24}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Stretch nudge (minutes)" hint="0 turns it off.">
              <input
                type="number"
                min={0}
                max={240}
                value={draft.stretchEveryMin}
                onChange={(e) =>
                  setDraft({ ...draft, stretchEveryMin: Number(e.target.value) })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Pinned note"
              hint="Stays above the pet until you clear it — good for the one thing today that matters."
            >
              <input
                value={draft.fixedMessage}
                placeholder="e.g. Submit the assignment by Friday"
                maxLength={60}
                onChange={(e) => setDraft({ ...draft, fixedMessage: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant={dirty ? "primary" : "ghost"}
              disabled={!dirty}
              onClick={async () => {
                await persist();
                onFlash("Care settings saved");
              }}
            >
              {dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

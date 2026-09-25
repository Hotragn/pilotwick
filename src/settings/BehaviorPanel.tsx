import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { accelFromEvent, applyHotkeys, prefs, prettyAccel } from "../state/prefs";
import { playCue } from "../state/sound";
import { Button, Card, PanelHeader, Slider, Toggle } from "./ui";

/**
 * How the companion sits on your desktop: size, presence, sound, and the
 * two global shortcuts that make it feel like part of the OS rather than an
 * app you have to go find.
 */
export default function BehaviorPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const p = prefs.use();
  const [autostart, setAutostart] = useState(false);
  const [capturing, setCapturing] = useState<"hotkeyToggle" | "hotkeySummon" | "hotkeyCapture" | null>(null);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => {});
  }, []);

  // Capture the next chord the user presses and bind it.
  useEffect(() => {
    if (!capturing) return;
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setCapturing(null);
        return;
      }
      const accel = accelFromEvent(e);
      if (!accel) return; // Still waiting for a real chord.
      const next = await prefs.patch({ [capturing]: accel });
      setCapturing(null);
      const err = await applyHotkeys(next);
      onFlash(err ? `Could not bind ${prettyAccel(accel)} — ${err}` : `Bound ${prettyAccel(accel)}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capturing, onFlash]);

  return (
    <div>
      <PanelHeader
        title="Appearance & behavior"
        blurb="Size, presence, sound and the shortcuts that summon your companion."
      />

      <div className="space-y-5">
        <Card title="On screen" blurb="Changes apply live — drag a slider and watch the pet.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Slider
              label="Pet size"
              value={p.petScale}
              min={0.6}
              max={2}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => prefs.patch({ petScale: v })}
            />
            <Slider
              label="Presence"
              value={p.opacity}
              min={0.35}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => prefs.patch({ opacity: v })}
            />
          </div>

          <div className="mt-4 border-t border-slate-800 pt-2">
            <Toggle
              label="Vanish during fullscreen"
              blurb="Steps aside automatically for presentations, screen shares and fullscreen games."
              checked={p.hideInFullscreen}
              onChange={(v) => prefs.patch({ hideInFullscreen: v })}
            />
            <div className="py-2">
              <p className="text-sm font-semibold text-slate-100">Where it lives</p>
              <p className="mb-3 text-xs leading-relaxed text-slate-400">
                Stay put, ride the window you are working in, or trot after your cursor.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { id: "free", label: "Stay put", hint: "Where you drop it" },
                    { id: "perch", label: "Perch", hint: "On the active window" },
                    { id: "follow", label: "Follow cursor", hint: "Trots after you" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => prefs.patch({ placement: opt.id })}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      p.placement === opt.id
                        ? "border-teal-400 bg-teal-950/40"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-100">{opt.label}</span>
                    <span className="block text-[11px] text-slate-400">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              label="Gravity"
              blurb="Let go of the pet and it falls to the bottom of the monitor with a small bounce. Only applies when it stays put."
              checked={p.gravity}
              onChange={(v) => prefs.patch({ gravity: v })}
            />
            <Toggle
              label="Open at login"
              blurb="Your companion greets you every time the computer starts."
              checked={autostart}
              onChange={async (v) => {
                try {
                  if (v) await enable();
                  else await disable();
                  setAutostart(v);
                  onFlash(v ? "Will open at login" : "Autostart disabled");
                } catch (err) {
                  onFlash(String(err));
                }
              }}
            />
          </div>

          <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
            <Button onClick={() => invoke("summon_to_cursor")}>Summon to cursor</Button>
            <Button onClick={() => invoke("toggle_overlay")}>Show / hide</Button>
            <Button
              onClick={async () => {
                await prefs.patch({ petScale: 1, opacity: 1 });
                onFlash("Size and presence reset");
              }}
            >
              Reset size
            </Button>
          </div>
        </Card>

        <Card
          title="Global shortcuts"
          blurb="These work from any app. Click a shortcut, then press the keys you want."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: "hotkeyToggle", label: "Show / hide companion" },
                { key: "hotkeySummon", label: "Summon to cursor" },
                { key: "hotkeyCapture", label: "Quick-capture a task" },
              ] as const
            ).map((row) => (
              <div key={row.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {row.label}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setCapturing(capturing === row.key ? null : row.key)}
                    className={`flex-1 rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
                      capturing === row.key
                        ? "animate-pulse border-teal-400 bg-teal-950/40 text-teal-200"
                        : "border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500"
                    }`}
                  >
                    {capturing === row.key ? "Press keys… (Esc to cancel)" : prettyAccel(p[row.key])}
                  </button>
                  <button
                    title="Unbind"
                    onClick={async () => {
                      const next = await prefs.patch({ [row.key]: "" });
                      await applyHotkeys(next);
                      onFlash("Shortcut cleared");
                    }}
                    className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-400 hover:text-rose-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            A chord needs at least one modifier — a bare letter would swallow that key
            system-wide.
          </p>
        </Card>

        <Card title="Sound & notifications">
          <Toggle
            label="Sound reactions"
            blurb="Short synthesized chirps for celebrations, timers and reminders. Off by default."
            checked={p.sound}
            onChange={async (v) => {
              await prefs.patch({ sound: v });
              if (v) playCue("celebrate");
            }}
          />
          {p.sound && (
            <div className="my-3 flex items-end gap-4">
              <div className="flex-1">
                <Slider
                  label="Volume"
                  value={p.soundVolume}
                  min={0.05}
                  max={1}
                  step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => prefs.patch({ soundVolume: v })}
                />
              </div>
              <Button onClick={() => playCue("celebrate")}>Test</Button>
            </div>
          )}
          <div className="border-t border-slate-800 pt-2">
            <Toggle
              label="Desktop notifications"
              blurb="For finished focus sessions and due reminders — the moments a speech bubble would be missed."
              checked={p.notifications}
              onChange={(v) => prefs.patch({ notifications: v })}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

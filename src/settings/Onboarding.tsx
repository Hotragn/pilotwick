import { useState } from "react";
import { motion } from "framer-motion";
import { enable } from "@tauri-apps/plugin-autostart";
import MascotView, { BUILTIN_MASCOTS } from "../companion/MascotView";
import { setMascot, useMascot, type BuiltinMascot } from "../profiles/mascotChoice";
import { prefs, prettyAccel } from "../state/prefs";
import { playCue } from "../state/sound";
import { Button } from "./ui";

/**
 * First run. Three screens, skippable, and the only moment the app asks for
 * anything: pick a face, learn the two gestures, decide about sound and
 * autostart. Everything else is discoverable later.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const active = useMascot();
  const p = prefs.use();

  const finish = async () => {
    await prefs.patch({ onboarded: true });
    onDone();
  };

  const steps = [
    {
      title: "Pick your companion",
      blurb: "You can change this any time, or upload your own artwork later.",
      body: (
        <div className="grid grid-cols-4 gap-3">
          {BUILTIN_MASCOTS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMascot(m.id as BuiltinMascot)}
              className={`rounded-xl border p-3 transition-colors ${
                active === m.id
                  ? "border-teal-400 bg-teal-950/30"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
              }`}
            >
              <div className="mx-auto h-20 w-20">
                <MascotView mascot={m.id} state="idle" />
              </div>
              <p className="mt-1 text-xs font-bold text-slate-100">{m.name}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Two gestures, that is it",
      blurb: "Your clicks pass straight through everywhere except the pet itself.",
      body: (
        <ul className="space-y-2.5">
          {[
            ["Tap the pet", "Quick actions — focus timer, tasks, mute, hide"],
            ["Drag the pet", "Move it anywhere on any monitor"],
            ["Right-click", "Opens this Studio"],
            ["Double-click", "An instant celebration, for no reason at all"],
            [prettyAccel(p.hotkeyToggle), "Show or hide it from any app"],
            [prettyAccel(p.hotkeySummon), "Summon it to your cursor"],
          ].map(([action, what]) => (
            <li key={what} className="flex items-center gap-3">
              <span className="w-40 shrink-0 rounded-md bg-slate-800 px-2 py-1 text-center font-mono text-xs font-bold text-teal-300">
                {action}
              </span>
              <span className="text-sm text-slate-300">{what}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "A couple of choices",
      blurb: "Both are off-by-default opinions you can flip whenever.",
      body: (
        <div className="space-y-3">
          <button
            onClick={async () => {
              const next = !p.sound;
              await prefs.patch({ sound: next });
              if (next) playCue("celebrate");
            }}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
              p.sound ? "border-teal-400 bg-teal-950/30" : "border-slate-800 bg-slate-950/60"
            }`}
          >
            <span>
              <span className="block text-sm font-bold text-slate-100">🔔 Sound reactions</span>
              <span className="text-xs text-slate-400">
                Short chirps for celebrations and timers.
              </span>
            </span>
            <span className="text-xs font-bold text-teal-300">{p.sound ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={async () => {
              await enable().catch(() => {});
            }}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left hover:border-slate-600"
          >
            <span>
              <span className="block text-sm font-bold text-slate-100">🚀 Open at login</span>
              <span className="text-xs text-slate-400">
                Your companion is there every time you sit down.
              </span>
            </span>
            <span className="text-xs font-bold text-slate-400">Enable</span>
          </button>

          <p className="pt-1 text-xs leading-relaxed text-slate-500">
            Pilotwick never uploads anything. Keystrokes are counted, never recorded — the hook
            discards the key code before it reaches the app.
          </p>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
          Welcome to Pilotwick · {step + 1} of {steps.length}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-50">{current.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{current.blurb}</p>

        <div className="my-6">{current.body}</div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs font-semibold text-slate-500 hover:text-slate-300"
          >
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
            <Button variant="primary" onClick={() => (last ? finish() : setStep(step + 1))}>
              {last ? "Start" : "Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

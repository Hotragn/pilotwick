import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CloudSun,
  ListTodo,
  Palette,
  PawPrint,
  Puzzle,
  SlidersHorizontal,
  Sparkles,
  Target,
  LocateFixed,
  type LucideIcon,
} from "lucide-react";
import MascotView from "../companion/MascotView";
import { useMascot } from "../profiles/mascotChoice";
import { useProfile } from "../profiles/profileManager";
import { prefs } from "../state/prefs";
import { openTasks, useTasks } from "../state/tasks";
import MascotPanel from "./MascotPanel";
import FocusPanel from "./FocusPanel";
import TasksPanel from "./TasksPanel";
import ActivityPanel from "./ActivityPanel";
import IntegrationsPanel from "./IntegrationsPanel";
import WorldPanel from "./WorldPanel";
import BehaviorPanel from "./BehaviorPanel";
import CustomArtPanel from "./CustomArtPanel";
import Onboarding from "./Onboarding";

/**
 * Companion Studio.
 *
 * One sidebar, one panel at a time. The old Studio was a single scroll of
 * unrelated cards, which made "where do I change X?" a scavenger hunt;
 * grouping by intent — who it is, how it helps, what it reacts to — means
 * every answer is one click from the left rail.
 */

type SectionId =
  | "companion"
  | "focus"
  | "tasks"
  | "activity"
  | "integrations"
  | "world"
  | "behavior"
  | "art";

const SECTIONS: { id: SectionId; icon: LucideIcon; label: string; group: string }[] = [
  { id: "companion", icon: PawPrint, label: "Companion", group: "Your pet" },
  { id: "art", icon: Palette, label: "Custom art", group: "Your pet" },
  { id: "focus", icon: Target, label: "Focus & care", group: "Helps you" },
  { id: "tasks", icon: ListTodo, label: "Tasks", group: "Helps you" },
  { id: "activity", icon: BarChart3, label: "Activity", group: "Helps you" },
  { id: "integrations", icon: Puzzle, label: "App reactions", group: "Reacts to" },
  { id: "world", icon: CloudSun, label: "Your world", group: "Reacts to" },
  { id: "behavior", icon: SlidersHorizontal, label: "Appearance", group: "Settings" },
];

export default function SettingsWindow() {
  const [section, setSection] = useState<SectionId>("companion");
  const [status, setStatus] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const mascot = useMascot();
  const { profile } = useProfile();
  const p = prefs.use();
  const pending = openTasks(useTasks()).length;

  // The tour only makes sense once prefs have actually loaded from disk.
  useEffect(() => setShowTour(!prefs.load().onboarded), []);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus((s) => (s === msg ? null : s)), 3200);
  };

  const panels: Record<SectionId, JSX.Element> = {
    companion: <MascotPanel onFlash={flash} />,
    art: <CustomArtPanel onFlash={flash} />,
    focus: <FocusPanel onFlash={flash} />,
    tasks: <TasksPanel onFlash={flash} />,
    activity: <ActivityPanel onFlash={flash} />,
    integrations: <IntegrationsPanel onFlash={flash} />,
    world: <WorldPanel onFlash={flash} />,
    behavior: <BehaviorPanel onFlash={flash} />,
  };

  let lastGroup = "";

  return (
    <div className="flex h-screen bg-slate-950 font-display text-slate-100">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <nav className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="h-11 w-11 shrink-0">
            <MascotView mascot={mascot} state="idle" profile={profile} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">Companion Studio</p>
            <p className="truncate text-[11px] text-slate-500">Pilotwick · local-only</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {SECTIONS.map((s) => {
            const header = s.group !== lastGroup ? s.group : null;
            lastGroup = s.group;
            const Icon = s.icon;
            return (
              <div key={s.id}>
                {header && (
                  <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    {header}
                  </p>
                )}
                <button
                  onClick={() => setSection(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                    section === s.id
                      ? "bg-teal-500/15 text-teal-200"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1">{s.label}</span>
                  {s.id === "tasks" && pending > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {pending}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 border-t border-slate-800 px-3 py-3">
          <button
            onClick={() => invoke("summon_to_cursor")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <LocateFixed size={14} /> Summon pet to cursor
          </button>
          <button
            onClick={() => setShowTour(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <Sparkles size={14} /> Replay the tour
          </button>
          <p className="px-2.5 pt-1 text-[10px] text-slate-600">
            Pet at {Math.round(p.petScale * 100)}% · {p.sound ? "sound on" : "sound off"}
          </p>
        </div>
      </nav>

      {/* ── Panel ───────────────────────────────────────────────────── */}
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {panels[section]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-teal-500/40 bg-teal-950/90 px-5 py-2 text-sm font-semibold text-teal-100 shadow-2xl backdrop-blur"
            >
              {status}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showTour && <Onboarding onDone={() => setShowTour(false)} />}
    </div>
  );
}

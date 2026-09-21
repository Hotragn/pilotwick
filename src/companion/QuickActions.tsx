import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BellOff,
  EyeOff,
  ListTodo,
  Settings,
  Square,
  Target,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { prefs } from "../state/prefs";
import { playCue } from "../state/sound";
import { addTask, formatDue, openTasks, removeTask, toggleTask, useTasks } from "../state/tasks";
import { loadPomodoro, startPomodoro, stopPomodoro, useWellnessConfig } from "../state/wellness";

/**
 * The quick-action dock — a single tap on the pet brings it up.
 *
 * Everything you would otherwise open a window for lives here: start a focus
 * session, jot down or tick off a task, mute, or send the pet away. The
 * Studio stays for configuration; this is for the ten-second interactions
 * that happen twenty times a day.
 */

const DUE_CHIPS = [
  { label: "10m", mins: 10 },
  { label: "30m", mins: 30 },
  { label: "1h", mins: 60 },
] as const;

export default function QuickActions({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"dock" | "tasks">("dock");
  const config = useWellnessConfig();
  const p = prefs.use();
  const tasks = useTasks();
  const [running, setRunning] = useState(() => loadPomodoro().running);
  const pending = openTasks(tasks);

  // The session can also start, stop or roll over from the Studio or the
  // care loop, so follow the shared state rather than a mount-time snapshot.
  useEffect(() => {
    const un = listen("companion://wellness-updated", () =>
      setRunning(loadPomodoro().running)
    );
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  // Escape always gets you back to your desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = async (fn: () => void | Promise<void>) => {
    playCue("pop");
    await fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="mb-1 w-[214px] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur"
      // The dock is a click target, not a drag handle.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait" initial={false}>
        {view === "dock" ? (
          <motion.div
            key="dock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-1"
          >
            <DockButton
              icon={running ? <Square size={15} fill="currentColor" /> : <Target size={16} />}
              title={running ? "Stop focus session" : `Focus ${config.focusMin}m`}
              active={running}
              onClick={() =>
                act(async () => {
                  if (running) await stopPomodoro();
                  else await startPomodoro(config);
                })
              }
            />
            <DockButton
              icon={<ListTodo size={16} />}
              title="Tasks"
              badge={pending.length || undefined}
              onClick={() => act(() => setView("tasks"))}
            />
            <DockButton
              icon={p.sound ? <Bell size={16} /> : <BellOff size={16} />}
              title={p.sound ? "Mute sounds" : "Unmute sounds"}
              active={p.sound}
              onClick={() => act(async () => void (await prefs.patch({ sound: !p.sound })))}
            />
            <DockButton
              icon={<EyeOff size={16} />}
              title="Hide until I summon it"
              onClick={() =>
                act(async () => {
                  onClose();
                  await invoke("set_overlay_visible", { visible: false });
                })
              }
            />
            <DockButton
              icon={<Settings size={16} />}
              title="Companion Studio"
              onClick={() =>
                act(async () => {
                  onClose();
                  await invoke("open_settings");
                })
              }
            />
          </motion.div>
        ) : (
          <TaskPanel key="tasks" onBack={() => setView("dock")} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DockButton({
  icon,
  title,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-base transition-colors ${
        active
          ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/60"
          : "text-slate-200 hover:bg-slate-800"
      }`}
    >
      {icon}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function TaskPanel({ onBack }: { onBack: () => void }) {
  const tasks = useTasks();
  const [text, setText] = useState("");
  const [dueMins, setDueMins] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = openTasks(tasks);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    if (!text.trim()) return;
    await addTask(text, dueMins === null ? null : Date.now() + dueMins * 60_000);
    playCue("chirp");
    setText("");
    setDueMins(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-1.5 p-1"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {pending.length ? `${pending.length} to do` : "All clear"}
        </p>
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded px-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft size={11} /> back
        </button>
      </div>

      {pending.length > 0 && (
        <ul className="max-h-[104px] space-y-1 overflow-y-auto pr-0.5">
          {pending.map((t) => (
            <li key={t.id} className="group flex items-center gap-1.5">
              <button
                title="Mark done"
                onClick={async () => {
                  await toggleTask(t.id);
                  playCue("pop");
                }}
                className="h-3.5 w-3.5 shrink-0 rounded border border-slate-600 hover:border-teal-400 hover:bg-teal-500/30"
              />
              <span className="flex-1 truncate text-[11px] text-slate-200">{t.text}</span>
              {t.dueAt !== null && (
                <span
                  className={`shrink-0 text-[9px] font-semibold ${
                    t.dueAt <= Date.now() ? "text-rose-300" : "text-slate-500"
                  }`}
                >
                  {formatDue(t.dueAt)}
                </span>
              )}
              <button
                title="Remove"
                onClick={() => removeTask(t.id)}
                className="shrink-0 text-slate-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Remember this for me…"
        maxLength={120}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-500"
      />

      <div className="flex items-center gap-1">
        <span className="text-[9px] uppercase tracking-wide text-slate-500">nudge</span>
        {DUE_CHIPS.map((chip) => (
          <button
            key={chip.mins}
            onClick={() => setDueMins(dueMins === chip.mins ? null : chip.mins)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
              dueMins === chip.mins
                ? "bg-teal-500 text-slate-950"
                : "bg-slate-800 text-slate-400 hover:text-slate-100"
            }`}
          >
            {chip.label}
          </button>
        ))}
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="ml-auto rounded bg-teal-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </motion.div>
  );
}

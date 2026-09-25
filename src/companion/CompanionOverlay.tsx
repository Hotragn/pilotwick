import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContextEngine } from "../state/contextEngine";
import { useCompanionStore } from "../state/companionStore";
import { prefs, applyHotkeys, migratePrefs } from "../state/prefs";
import { playCue } from "../state/sound";
import { CircleAlert, GitPullRequestArrow, Loader } from "lucide-react";
import { useReminderLoop } from "../state/reminders";
import { openTasks, useTasks } from "../state/tasks";
import { useWorkStatus } from "../state/work";
import { formatCountdown, useCareLoop } from "../state/wellness";
import { useWeather } from "../state/weather";
import WeatherEffects from "./WeatherEffects";
import { useProfile } from "../profiles/profileManager";
import { useMascot } from "../profiles/mascotChoice";
import MascotView from "./MascotView";
import QuickActions from "./QuickActions";

/** The pet's box at 100 % scale. */
const PET_PX = 185;

/**
 * The transparent always-on-top overlay window.
 *  - drag the pet   → move it anywhere (it squishes like mochi while grabbed)
 *  - hover the pet  → a handle appears; click it for quick actions
 *  - right-click    → Companion Studio
 *  - double-click   → instant celebration 🎉
 * Click-through is handled by Rust: the window only accepts mouse events
 * while the cursor is actually over the pet's own box.
 */
export default function CompanionOverlay() {
  useContextEngine();
  useReminderLoop();
  const { config, pomodoro, remainingMs } = useCareLoop();
  const state = useCompanionStore((s) => s.state);
  const contextLabel = useCompanionStore((s) => s.contextLabel);
  const bubble = useCompanionStore((s) => s.bubble);
  const hovering = useCompanionStore((s) => s.hovering);
  const celebrate = useCompanionStore((s) => s.celebrate);
  const { profile } = useProfile();
  const mascot = useMascot();
  const weather = useWeather();
  const p = prefs.use();
  const tasks = useTasks();
  const work = useWorkStatus();
  const [grabbed, setGrabbed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"dock" | "tasks">("dock");
  const shellRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const pending = openTasks(tasks);

  // Re-point the Rust git watcher at the saved repo on startup, and claim
  // the global hotkeys (they live in the OS, so they need re-registering
  // every launch).
  useEffect(() => {
    migratePrefs();
    const repo = localStorage.getItem("pilotwick.gitrepo");
    if (repo) invoke("set_git_repo", { path: repo });
    void applyHotkeys();
  }, []);

  // Keep the window sized to the chosen pet scale.
  useEffect(() => {
    void invoke("set_overlay_scale", { scale: p.petScale });
  }, [p.petScale]);

  // Physics and the work watcher live in Rust; mirror the prefs across.
  useEffect(() => {
    void invoke("set_placement", { mode: p.placement });
  }, [p.placement]);

  useEffect(() => {
    void invoke("set_work_watch", { enabled: p.workStatus });
  }, [p.workStatus]);

  /**
   * Tell Rust which slice of the window is actually solid. Without this the
   * whole 240×320 transparent box swallows hover, and the pet feels like it
   * has an invisible force field around it.
   */
  const reportHitBox = useCallback(() => {
    const shell = shellRef.current;
    const target = menuOpen ? shell : petRef.current;
    if (!shell || !target) return;
    const box = shell.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const rect = target.getBoundingClientRect();
    void invoke("set_hit_box", {
      left: (rect.left - box.left) / box.width,
      top: (rect.top - box.top) / box.height,
      right: (rect.right - box.left) / box.width,
      bottom: (rect.bottom - box.top) / box.height,
    });
  }, [menuOpen]);

  useLayoutEffect(() => {
    reportHitBox();
    window.addEventListener("resize", reportHitBox);
    return () => window.removeEventListener("resize", reportHitBox);
  }, [reportHitBox, p.petScale]);

  // While the dock is open the pointer must never fall through, even if it
  // strays past the hit box mid-click.
  useEffect(() => {
    void invoke("set_interactive", { interactive: menuOpen });
  }, [menuOpen]);

  // Quick capture: the global hotkey drops you straight into the task field
  // from anywhere, without reaching for the mouse.
  useEffect(() => {
    const un = listen("companion://quick-capture", () => {
      setMenuView("tasks");
      setMenuOpen(true);
    });
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  // Step aside for presentations, screen shares and fullscreen games — and
  // come back only if that is what put the pet away. Someone who hid it by
  // hand should not have it reappear when they quit a game.
  const hiddenByFullscreen = useRef(false);
  useEffect(() => {
    const un = listen<boolean>("companion://fullscreen", ({ payload: fullscreen }) => {
      if (fullscreen) {
        if (!prefs.load().hideInFullscreen || hiddenByFullscreen.current) return;
        hiddenByFullscreen.current = true;
        setMenuOpen(false);
        void invoke("set_overlay_visible", { visible: false });
      } else if (hiddenByFullscreen.current) {
        hiddenByFullscreen.current = false;
        void invoke("set_overlay_visible", { visible: true });
      }
    });
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  /**
   * Dragging has to begin on pointer-down. `startDragging` posts a
   * WM_NCLBUTTONDOWN and Windows only enters its move-loop if that message
   * arrives at press time; deferring it until the cursor had travelled a few
   * pixels (to tell a tap from a drag) meant it always landed too late and
   * the pet would not move at all. So the pet body is purely a drag surface
   * and the quick-action dock gets its own handle.
   */
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.detail >= 2) return;
    setMenuOpen(false);
    dragging.current = true;
    // Perch and follow both move the window; pause them for the duration of
    // the gesture so the pet cannot pull against the hand holding it.
    void invoke("suspend_placement", { suspended: true });
    setTimeout(() => void invoke("suspend_placement", { suspended: false }), 1200);
    // Mochi squish while dragging; the spring releases on its own.
    setGrabbed(true);
    setTimeout(() => setGrabbed(false), 700);
    void getCurrentWindow().startDragging();
  };

  /**
   * Gravity. Perch and settle both move the window themselves, so this only
   * arms after a gesture the *user* started — otherwise the pet would keep
   * re-settling in response to its own animation.
   */
  useEffect(() => {
    if (!p.gravity || p.placement !== "free") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const un = getCurrentWindow().onMoved(() => {
      if (!dragging.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        dragging.current = false;
        void invoke("settle_overlay");
      }, 320);
    });
    return () => {
      clearTimeout(timer);
      un.then((fn) => fn());
    };
  }, [p.gravity, p.placement]);

  const pinned = config.fixedMessage.trim();

  return (
    <div
      ref={shellRef}
      className="flex h-full w-full flex-col items-center justify-end pb-1"
      style={{ opacity: p.opacity }}
      onPointerDown={onPointerDown}
      onDoubleClick={() => celebrate("Yay! 🎉")}
      onContextMenu={(e) => {
        e.preventDefault();
        invoke("open_settings");
      }}
    >
      {/* Pinned note (always visible when set) */}
      {pinned && !bubble && !menuOpen && (
        <div className="mb-1 max-w-[210px] truncate rounded-md border border-amber-400/40 bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold text-amber-200 shadow">
          📌 {pinned}
        </div>
      )}

      {/* Speech bubble (reminders, agent-done, pomodoro) */}
      <AnimatePresence>
        {bubble && !menuOpen && (
          <motion.div
            key={bubble.text}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.85 }}
            className="mb-1 max-w-[215px] rounded-xl border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-center text-[11px] font-bold text-slate-100 shadow-xl"
          >
            {bubble.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <QuickActions
            initialView={menuView}
            onClose={() => {
              setMenuOpen(false);
              setMenuView("dock");
            }}
          />
        )}
      </AnimatePresence>

      {weather && <WeatherEffects weather={weather} />}

      <motion.div
        ref={petRef}
        className="relative cursor-grab active:cursor-grabbing"
        // Laid out rather than transformed: `getBoundingClientRect` then
        // reports the true size immediately, so the hit box stays honest.
        style={{ width: PET_PX * p.petScale, height: PET_PX * p.petScale }}
        animate={{
          scale: hovering ? 1.05 : 1,
          scaleY: grabbed ? 1.18 : 1,
          scaleX: grabbed ? 0.88 : 1,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      >
        <MascotView mascot={mascot} state={state} profile={profile} />

        {/*
          The actions handle. It sits *inside* the pet's box on purpose: the
          window is click-through everywhere outside that box, so a control
          floating above the pet would not be clickable at all.
        */}
        <AnimatePresence>
          {(hovering || menuOpen) && (
            <motion.button
              key="handle"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              title="Quick actions"
              aria-label="Quick actions"
              // Keep the press away from the shell, which would start a drag.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                playCue("pop");
                setMenuView("dock");
                setMenuOpen((open) => !open);
              }}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/90 text-[13px] leading-none text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-teal-400 hover:text-teal-200"
            >
              {menuOpen ? "×" : "⋯"}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Open tasks ride on the pet's collar. */}
        {pending.length > 0 && !menuOpen && (
          <span
            title={`${pending.length} open task${pending.length > 1 ? "s" : ""}`}
            className="absolute bottom-3 right-4 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-slate-900 bg-rose-500 px-1 text-[10px] font-bold text-white shadow"
          >
            {pending.length > 9 ? "9+" : pending.length}
          </span>
        )}
      </motion.div>

      <div className="flex h-6 items-center gap-2">
        {/* Weather badge */}
        {weather && (
          <div className="rounded-md border border-sky-500/40 bg-sky-950/80 px-2 py-0.5 text-[10px] font-bold text-sky-200 shadow">
            {weather.kind === "rain" ? "🌧" : weather.kind === "snow" ? "🌨" : weather.kind === "hot" ? "🌞" : weather.kind === "cold" ? "🥶" : weather.kind === "clear" ? "☀️" : "⛅"}{" "}
            {weather.tempC}°C
          </div>
        )}

        {/* CI is the one thing worth a permanent chip — a bubble you miss
            is no use when a build is broken. */}
        {work.ci === "failed" && (
          <div
            title={work.branch ? `CI failed on ${work.branch}` : "CI failed"}
            className="flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-950/85 px-2 py-0.5 text-[10px] font-bold text-rose-200 shadow"
          >
            <CircleAlert size={11} /> CI
          </div>
        )}
        {work.ci === "running" && (
          <div
            title="CI running"
            className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-200 shadow"
          >
            <Loader size={11} className="animate-spin" /> CI
          </div>
        )}
        {work.reviews > 0 && (
          <div
            title={`${work.reviews} pull request(s) awaiting your review`}
            className="flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-950/80 px-2 py-0.5 text-[10px] font-bold text-violet-200 shadow"
          >
            <GitPullRequestArrow size={11} /> {work.reviews}
          </div>
        )}

        {/* Pomodoro countdown */}
        {pomodoro.running && (
          <div
            className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold shadow ${
              pomodoro.phase === "focus"
                ? "border-rose-500/50 bg-rose-950/80 text-rose-200"
                : "border-emerald-500/50 bg-emerald-950/80 text-emerald-200"
            }`}
          >
            {pomodoro.phase === "focus" ? "🎯" : "☕"} {formatCountdown(remainingMs)}
          </div>
        )}

        <AnimatePresence>
          {contextLabel && (
            <motion.div
              key={contextLabel}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              className="rounded-full bg-slate-900/80 px-3 py-0.5 text-[10px] font-semibold tracking-wide text-teal-200 shadow-lg backdrop-blur"
            >
              {contextLabel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

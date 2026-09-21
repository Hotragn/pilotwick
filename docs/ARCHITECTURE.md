# Architecture

## Design principle: Rust senses, React decides

The Rust backend is deliberately **policy-free**. It knows nothing about
Claude, VS Code, cats, or moods — it only watches the OS and emits events.
All personality, matching rules and rendering live in TypeScript, so 95% of
contributions never touch Rust or require understanding Tauri internals.

```
┌────────────────────────── Rust (src-tauri) ──────────────────────────┐
│ tracker.rs   30Hz cursor loop ──► companion://cursor {x,y,win,hover} │
│              └─ owns set_ignore_cursor_events, tested against the    │
│                 frontend-reported hit box (set_hit_box)              │
│              rdev keyboard hook ──► companion://keyboard (pulse only)│
│                                 ──► companion://scroll (throttled)   │
│ appwatch.rs  focused-window poll ──► companion://active-app          │
│                                  ──► companion://fullscreen (bool)   │
│ gitwatch.rs  repo poll ──► companion://git {commit|branch|conflict}  │
│ workwatch.rs git + gh poll ──► companion://work {ci|review|dirty}    │
│ perch.rs     window perching + gravity (moves the overlay directly)  │
│ lib.rs       tray · global hotkeys · window commands                 │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Tauri events
┌──────────────────────────────▼───────────────────────────────────────┐
│ contextEngine.ts   subscribes + 400ms heartbeat                      │
│ companionStore.ts  priority ladder:                                  │
│   celebrating > grumpy > stretching > overheat > waking > petting >  │
│   hunting > typing > playing > integration state > sleeping > idle   │
│   + "long task" heuristic (AI session ≥45s ends → celebrate)         │
│ integrations/      registry of matchers (app,title) → state,label    │
│ state/tasks.ts     the to-do list + due-reminder scheduling          │
│ state/prefs.ts     size, presence, sound, hotkeys, muted reactions   │
│ state/work.ts      CI / review / dirty status → moods, chips, toasts │
│ companion/         mascots · overlay · quick-action dock             │
│ profiles/          .companion.json import/export                     │
│ settings/          Companion Studio panels                           │
└──────────────────────────────────────────────────────────────────────┘
```

## Click-through: how the overlay never blocks you

A transparent always-on-top window would normally eat every click. Instead,
the cursor loop in `tracker.rs` compares the global cursor position against a
**hit box** each tick and flips `set_ignore_cursor_events`:

- cursor **outside** the pet → window ignores the mouse entirely (click-through)
- cursor **over** the pet → window becomes interactive (tap / drag / right-click)

The hit box is not the window rect. The overlay window is mostly empty
transparent space, so the frontend measures the pet's own bounding box and
reports it as fractions of the window via the `set_hit_box` command. Without
this the pet feels like it has an invisible force field around it.

The cursor loop is the **single owner** of the OS flag. `set_interactive`
(used while the quick-action dock is open) only raises a "force interactive"
bit and lets the loop converge within one frame — if a command wrote the flag
directly, the loop's cached transition state would go stale and could strand
the pet as permanently click-through.

## Gestures: why dragging starts on pointer-down

`startDragging()` posts a `WM_NCLBUTTONDOWN`, and Windows only enters its
window move-loop if that message arrives **at press time**. An earlier design
waited until the cursor had travelled a few pixels — so it could tell a tap
from a drag — and the pet became completely immovable: the message always
landed too late.

So the pet body is a pure drag surface, and the quick-action dock gets its
own **⋯** handle that fades in on hover. The handle is positioned *inside*
the pet's hit box on purpose: the window is click-through everywhere else, so
a control floating above the pet would not be clickable at all.

## Telling fullscreen from maximized

`appwatch.rs` will not hide the pet on size alone. A maximized window on
Windows deliberately overhangs its monitor by the border width (a maximized
browser measures ~101% of the screen), and the desktop shell itself is
borderless and monitor-sized. Either one trips a naive "does it cover the
screen?" test, and the companion vanishes during ordinary work.

The Windows path therefore checks the window *style bits* — bailing on
`WS_MAXIMIZE` or `WS_CAPTION` — and skips shell classes (`Progman`,
`WorkerW`, `Shell_TrayWnd`). Other platforms fall back to a strict geometry
comparison.

## Windows

| Label | Purpose | Config |
|---|---|---|
| `main` | the pet overlay | transparent, frameless, always-on-top, skip-taskbar, non-closable (tray owns quit). Resized by `set_overlay_scale` to honour the pet-size preference. |
| `settings` | Companion Studio | declared in `tauri.conf.json` and created **hidden at startup**; `open_settings` only shows it, and closing hides rather than destroys |

Both windows run the same React bundle; `App.tsx` switches on the **window
label** (labels are fixed at creation, unlike URL fragments, which can get
percent-encoded when Tauri joins them onto the dev server URL).

The Studio is pre-created rather than built on demand because building a
WebView2 window lazily from a command proved flaky on Windows: roughly half
the time the shell came back minimized at -32000,-32000 with its page stuck
on `about:blank`, unresponsive even to a debugger. Windows declared in the
config are created by Tauri on the main thread during startup, which is
reliable — and the Studio now opens instantly instead of cold-starting a
webview, for about 0.7 MB.

## Cross-window state

Both windows share one origin, so `localStorage` is the store of record —
synchronous on first paint and durable across restarts. A change in one
window reaches the other through a Tauri event, since the DOM `storage` event
is only a fallback in some webviews. `state/persisted.ts` packages that
triple (`load` / `patch` / `use`) into one factory rather than re-implementing
it per setting.

The one exception is companion **profiles**, which live in a real file under
the app data directory: localStorage's ~5 MB quota silently rejects bundled
GIFs.

## Privacy invariants

1. **Two network features, both opt-in and both off by default.** Weather
   (Open-Meteo, sends a city name) and work status (shells out to the user's
   own `gh` CLI, which talks to GitHub as them). There is no Pilotwick
   backend: no telemetry, no account, no crash reporting.
2. **No key codes.** The rdev callback pattern-matches `KeyPress(_)` and emits
   an empty pulse. Which key was pressed never crosses the Rust/JS boundary.
3. **Minimal window info.** Only the app name and window title are read —
   never window contents, and only to match against integration regexes
   locally. Any integration can be switched off individually in the Studio.
4. **Sound is synthesized, not sampled.** Cues are WebAudio oscillator
   envelopes, so there are no audio assets and nothing to license.
5. **No third-party artwork ships.** Every built-in mascot is drawn in code
   (pixel grids or SVG), so the repo carries nothing it cannot license under
   MIT. Uploaded profiles stay on the user's machine.

## Performance budget

- Cursor loop: 30 Hz, one syscall + rect compare; event emission is the bulk.
- App watch: 0.8 s poll, emits only on change (app/title *and* fullscreen are
  each change-gated separately).
- Frontend heartbeat: 400 ms state re-derivation over a handful of numbers.
  The disabled-integrations set is cached and refreshed on change rather than
  re-parsed from storage 2.5 times a second.
- Reminder sweep: 15 s, over a list capped at 25 items.
- Work status: 20 s for the local `git status`, ~100 s for the `gh` calls,
  and only while the user has switched it on.
- Perch loop: 150 ms, and it only moves the window when the target shifts by
  more than 2 px.
- Built-in mascots are pure SVG — no image decoding, no canvas, GPU-composited
  transforms only. Shading, contact shadow and outline are computed in the
  renderer (`PixelStage.tsx`), so new sprites inherit them for free.

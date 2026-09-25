<div align="center">

# 🐾 Pilotwick - Your Custom Desktop Companion

**A tiny, context-aware pet that lives on your screen and actually helps.**
It watches your cursor, cheers when your AI finishes a long task, holds your to-do list, runs your focus timer, and can be *anything* you want it to be.

[![CI](https://github.com/Hotragn/pilotwick/actions/workflows/ci.yml/badge.svg)](https://github.com/Hotragn/pilotwick/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Hotragn/pilotwick?include_prereleases&sort=semver)](https://github.com/Hotragn/pilotwick/releases)
[![Downloads](https://img.shields.io/github/downloads/Hotragn/pilotwick/total)](https://github.com/Hotragn/pilotwick/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)

*1.3 MB installer · ~30 MB RAM · no account, no telemetry, no cloud*

**Status:** v0.1.0 — early, but everything documented here works. Built and tested on Windows; macOS and Linux build from source (see [Platform support](#-platform-support)).

<img src="docs/assets/hero.png" alt="Pilotwick reacting to Claude, VS Code and Spotify" width="640" />

**[Try it live, no install](https://hotragn.github.io/pilotwick/) · [Download](../../releases) · [What it does](#-what-makes-pilotwick-different) · [Create your own](#-create-your-own-companion) · [Add an integration](#-add-an-app-integration-in-15-lines) · [Showcase](#-showcase)**

</div>

> **See it before you install it.** The companion on
> **[the site](https://hotragn.github.io/pilotwick/)** is the real one —
> same sprite, same state machine, running in your browser. Move your
> mouse, scroll, type.

---

## Install

**[Download for your platform →](https://github.com/Hotragn/pilotwick/releases/latest)** — Windows, macOS (Intel + Apple Silicon), Linux.

Or build it:

```bash
git clone https://github.com/Hotragn/pilotwick
cd pilotwick
npm install
npm run tauri dev
```

Prereqs: Node 18+, Rust via [rustup](https://rustup.rs), and the
[Tauri system deps](https://tauri.app/start/prerequisites/) for your OS.

Unsigned for now, so Windows SmartScreen and macOS Gatekeeper warn on first
run — "More info → Run anyway", or right-click → Open on macOS.

---

## What it does for you

Most desktop pets are cute but oblivious, and you close them by the second
day. Pilotwick earns its place by doing work.

**Ambient work status.** Opt in and it becomes a peripheral monitor: a chip
while CI runs, a red chip and a hiss when it fails, a nudge when a pull
request is waiting on your review, a word when your working tree gets out of
hand. It shells out to the `git` and `gh` you already have — nothing is
proxied anywhere.

**Tasks it carries for you.** `Ctrl+Shift+Space` from anywhere drops you
straight into the task field, even if the pet is hidden. Give a task a
10m / 30m / 1h nudge and it reminds you with a speech bubble and a desktop
notification. Open tasks ride on its collar as a badge.

**A focus timer on your desktop, not in a tab.** Classic, deep-work and
sprint presets, a countdown floating beside the pet, and accessories the
companion earns as you finish sessions.

**An honest picture of your day.** Coding versus AI versus browsing versus
gaming, today and across the last seven days, assembled from what it already
sees and stored only on your machine.

**It knows when to disappear.** Steps aside for presentations, screen shares
and fullscreen games — and it tells a *maximized* window from a fullscreen
one, so it does not vanish every time you maximize a browser.

### Where it lives

Three placements, in the Studio under Appearance:

| Mode | Behaviour |
|---|---|
| **Stay put** | Sits where you drop it. Turn on gravity and it falls to the floor with a bounce. |
| **Perch** | Rides the title bar of whatever window you are working in, following you between apps. |
| **Follow cursor** | Trots after your pointer and settles beside it. Stays put while you work near it. |

### What it reacts to

Your editor, terminal, browser, chat, design tools, games and music all get
their own mood, and every one is individually switchable in the Studio.
Beyond apps, it responds to: **AI agents** thinking and finishing, **git**
commits, branch switches and merge conflicts, **CI** passing and failing,
**review requests**, your **cursor** and typing, and being **hovered**.
Leave for ninety seconds and it falls asleep.

It is a true overlay throughout: frameless, transparent, always-on-top and
click-through, so your clicks pass straight through unless you are actually
on the pet.

## Building a release

```bash
npm run tauri build
```

Or tag a version and CI builds every platform for you.

### Controls

| Gesture | What happens |
|---|---|
| **Drag** the pet | Move it anywhere, on any monitor |
| **Hover** the pet → click the **⋯** handle | Quick-action dock — focus timer, tasks, mute, hide, Studio |
| **Right-click** | Companion Studio |
| **Double-click** | Instant celebration 🎉 |
| `Ctrl+Shift+E` | Show / hide from any app |
| `Ctrl+Shift+F` | Summon to your cursor |
| `Ctrl+Shift+Space` | Quick-capture a task from anywhere |
| Tray icon | Show/hide · summon · Studio · quit |

## 🖥️ Platform support

| | Overlay & moods | Global input | Placement | Fullscreen detection |
|---|---|---|---|---|
| **Windows** | ✅ tested | ✅ | ✅ | ✅ uses window style bits |
| **macOS** | builds | needs Accessibility permission | untested | falls back to geometry |
| **Linux** | builds | X11 only (Wayland limits global input) | untested | falls back to geometry |

Only Windows has been run end-to-end so far. The other two compile from the
same source and degrade gracefully, but treat them as unverified until
someone reports back — issues and fixes very welcome.

> **macOS:** grant Accessibility permission (System Settings → Privacy) so Pilotwick can sense typing and window focus.

## 🎛️ Companion Studio

Right-click the pet (or use the tray) to open the Studio — a sidebar-organised control room rather than one long settings scroll:

| Section | What's in it |
|---|---|
| 🐾 **Companion** | The gallery. Every card renders the **live, animating mascot**, and a preview stage plays back any mood on demand, so you pick what you actually saw. |
| 🎨 **Custom art** | Map your own GIFs or sprite sheets to each mood; export the lot as one shareable file. |
| 🎯 **Focus & care** | Pomodoro presets, stretch nudges, your name, a pinned note. |
| 📝 **Tasks** | The full list with real reminder times. |
| 📊 **Activity** | Today's breakdown, a 7-day chart, evolution progress. |
| 🧩 **App reactions** | Every integration, individually switchable — mute the Netflix one before a screen share. |
| 🌦️ **Your world** | Weather moods, work status (CI / reviews), and git repo watching. |
| ⚙️ **Appearance** | Pet size, presence, placement (stay put / perch / follow), gravity, global shortcuts, sound, notifications, fullscreen behaviour. |

First launch walks you through a three-screen tour; replay it any time from the sidebar.

## 🎨 Create Your Own Companion

Don't want a cat? Make it a slime, your startup's logo, or a pixel-art Ferris.
Studio → **Custom art**:

1. **Upload** a GIF (or PNG/WebP) for each mood — `Idle` is the only required one.
2. Got a **sprite sheet**? One click converts it — set frame size, count, FPS, columns and watch the live preview.
3. Hit **Apply**. Your companion is alive.
4. Hit **Export & Share** → you get a single `my-pet.companion.json` with **all assets bundled inside**. Send it to anyone; they import it in one click.

```jsonc
// anatomy of a .companion.json
{
  "schema": 1,
  "meta": { "name": "Pixel Cat", "author": "@you" },
  "states": {
    "idle":        { "kind": "gif",    "data": "data:image/gif;base64,..." },
    "typing":      { "kind": "sprite", "data": "data:image/png;base64,...",
                     "frameWidth": 32, "frameHeight": 32, "frames": 8, "fps": 12 },
    "celebrating": { "kind": "gif",    "data": "data:image/gif;base64,..." }
  }
}
```

Made something great? **Open a PR to [`community/profiles/`](community/) and get featured in the Showcase.** ⭐

## 🧩 Add an app integration in 15 lines

Want your companion to react to Figma, OBS, or League of Legends? Integrations are plain TypeScript — **no Rust, no rebuild logic, one file**:

```ts
// src/integrations/figma.ts
import type { Integration } from "./types";

export const figma: Integration = {
  id: "figma",
  name: "Design Mode",
  priority: 8,
  state: "designing",            // any string — map art to it in the Studio
  matches: (ctx) => /figma/i.test(`${ctx.app} ${ctx.title}`),
  label: () => "Designing · Figma",
  apps: ["Figma"],               // shown in the Studio's reactions list
};
```

Register it in `src/integrations/registry.ts` and it appears in the Studio with its own on/off switch automatically. Done — that's a complete, mergeable PR.

## 🏗️ Architecture

```
pilotwick/
├── src-tauri/               # Rust: the "senses" (policy-free, just emits events)
│   ├── src/tracker.rs       #   global cursor + keyboard pulse + click-through hit box
│   ├── src/appwatch.rs      #   which app is focused, and whether it's fullscreen
│   ├── src/perch.rs         #   window perching + gravity
│   ├── src/workwatch.rs     #   CI, review requests, uncommitted work
│   ├── src/gitwatch.rs      #   commits, branches, merge conflicts
│   └── src/lib.rs           #   windows, tray, hotkeys, overlay commands
└── src/                     # React: the "brain & face"
    ├── state/               #   zustand state machine, tasks, prefs, sound, stats
    ├── integrations/        #   👈 community playground (one file per app)
    ├── companion/           #   mascots, the overlay, the quick-action dock
    ├── profiles/            #   shareable .companion.json engine
    └── settings/            #   Companion Studio panels
```

- **Rust senses, React decides.** The backend only emits `companion://cursor`, `companion://keyboard` (a bare pulse — *never* which key), `companion://active-app`, `companion://fullscreen` and `companion://git`. All personality lives in the frontend.
- **Privacy first.** No account, no telemetry, no keylogging — the keyboard hook discards the key code before it reaches the app. See [What touches the network](#-what-touches-the-network).

Deep dive: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🔒 What touches the network

Pilotwick has no backend and no telemetry. Nothing is collected, and there is
nowhere for it to be sent. Two **opt-in** features do reach the internet, both
off by default:

| Feature | What it contacts | What it sends |
|---|---|---|
| Weather moods | Open-Meteo | the city name you typed, nothing else |
| Work status | GitHub, via **your** `gh` CLI | nothing extra — it runs `gh run list` and `gh search prs` as you, using credentials you already authorised |

Everything else — typing pulses, window titles, activity stats, tasks — is
read locally and stored on your machine. Window titles are matched against
integration regexes in-process and never leave it, and every integration can
be switched off individually in the Studio.

## 🏆 Showcase

| Companion | Author | |
|---|---|---|
| 😺 Pixel (default) | core team | built-in |
| 🐶 Biscuit | core team | built-in |
| 🐱 Mochi | core team | built-in |
| 🐉 Ember | core team | built-in |
| 🟢 Blip · 👻 Wisp · 🤖 Bolt | core team | [community/profiles](community/profiles/) |
| *your creation here* | *you* | [submit →](CONTRIBUTING.md) |

## 🗺️ Roadmap

- [x] Quick-action dock on the pet
- [x] Tasks & reminders the companion carries for you
- [x] Pomodoro / focus-timer state
- [x] Sound reactions (opt-in chirps)
- [x] Auto-hide during presentations and fullscreen
- [x] Global hotkeys + summon to cursor
- [x] Window perching, gravity and follow-cursor
- [x] Global quick-capture for tasks
- [x] Ambient work status (CI, reviews, uncommitted work)
- [ ] Community profile gallery site with one-click install
- [ ] Multi-monitor wandering
- [ ] Companion-to-companion interactions over LAN 👀

## 🤝 Contributing

Integrations, mascot art, state ideas, docs — everything is welcome and most PRs are a single file. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [`good first issue`](../../labels/good%20first%20issue) label.

If Pilotwick made you smile, **star the repo** — it genuinely helps more people find their companion. ⭐

## 📄 License

[MIT](LICENSE) — do anything, just keep the notice.

<div align="center"><sub>Pilotwick — a pilot light for your workday.</sub></div>

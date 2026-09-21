# Contributing to Pilotwick 🐾

Thanks for being here! Most contributions are **a single TypeScript file** — this is one of the friendliest codebases you'll ever PR to.

## The three easiest ways to contribute

### 1. Add an app integration (most wanted!)
Teach the companion to recognize a new app:

1. Copy `src/integrations/spotify.ts` → `src/integrations/yourApp.ts`.
2. Change the `matches()` regex and pick a `state` (reuse `coding`/`vibing`/`ai-sync`, or invent a new string).
3. Add it to the array in `src/integrations/registry.ts`.
4. List a few recognisable app names in the optional `apps` field — the Studio shows them next to the integration's on/off switch.
5. PR title: `feat(integration): <app name>`. Include a screenshot or clip if you can.

Nothing else is needed: the Studio's **App reactions** panel is generated from the registry, so your integration gets its own toggle for free.

### 2. Share a Custom Companion Profile
1. Build it in the Companion Studio → **Custom art** (right-click the pet).
2. **Export & Share** → drop the `.companion.json` into `community/profiles/`.
3. Add a row to the README Showcase table with a preview GIF.

### 3. Improve the built-in mascots
`src/companion/PixelCat.tsx` (default) and `PixelDog.tsx` are pixel grids; `MochiCat.tsx` and `EmberDragon.tsx` are SVG + framer-motion variants. New states, better easing, more charm — all welcome.

Pixel mascots render through `PixelStage.tsx`, which adds the contact shadow, directional shading and drop shadow for you — draw the flat grid and let the renderer do the lighting.

Adding a whole new mascot? Add it to the switch **and** the `BUILTIN_MASCOTS` list in `src/companion/MascotView.tsx` — that is the single place both the overlay and the Studio's live gallery read from, so one edit makes it selectable and previewable.

## Dev setup

```bash
npm install
npm run tauri dev
```

Rust changes hot-restart; React changes hot-reload instantly.

## Ground rules

- **Privacy is non-negotiable.** No telemetry, ever. No reading key codes, and
  no window content beyond app name + title. A feature may only touch the
  network if the user explicitly switches it on, it is off by default, and the
  README's [What touches the network](README.md#-what-touches-the-network)
  table is updated in the same PR. Violating PRs are closed without discussion.
- **Only art you can license under MIT.** Do not contribute sprites, GIFs or
  profiles built from film, game or anime frames, however good they look — it
  puts the whole project at risk. Original work, or something with a clear
  permissive licence, only.
- Keep integrations dependency-free.
- `npm run build` must pass (TypeScript strict mode), and `cargo check` in `src-tauri/` if you touched Rust.
- Sound stays synthesized (`src/state/sound.ts`) — no audio assets in the repo.
- New settings go through `createPersisted` in `src/state/persisted.ts`, not a hand-rolled localStorage triple.
- Be kind. Companions are for everyone.

## Reporting bugs

Open an issue with your OS + version, what you expected, what happened, and `npm run tauri dev` console output if relevant.

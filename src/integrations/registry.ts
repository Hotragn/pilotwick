import { listen } from "@tauri-apps/api/event";
import type { ActiveContext, Integration } from "./types";
import { prefs } from "../state/prefs";
import { aiTools } from "./aiTools";
import { codeEditors } from "./codeEditors";
import { terminals } from "./terminals";
import { browsing, webMusic, webVideo } from "./browsers";
import { design } from "./design";
import { gaming } from "./gaming";
import { chat } from "./chat";
import { spotify } from "./spotify";
import { docs } from "./docs";

/**
 * ─── ADD YOUR INTEGRATION HERE ─────────────────────────────────────────────
 * 1. Create `src/integrations/yourApp.ts` exporting an `Integration`.
 * 2. Import it and add it to this array. That's the whole contribution.
 */
const integrations: Integration[] = [
  aiTools,
  codeEditors,
  terminals,
  webVideo,
  webMusic,
  design,
  gaming,
  chat,
  spotify,
  docs,
  browsing,
];

const sorted = [...integrations].sort((a, b) => b.priority - a.priority);

/**
 * `resolveIntegration` runs on every heartbeat, so the user's disabled list
 * is cached here rather than re-parsed from storage 2.5 times a second.
 */
let disabled = new Set(prefs.load().disabledIntegrations);
const refreshDisabled = () => {
  disabled = new Set(prefs.load().disabledIntegrations);
};
// Outside a Tauri webview (plain `vite dev`) there is no IPC to listen on;
// the cached set just stays at its initial value.
listen(prefs.event, refreshDisabled).catch(() => {});
window.addEventListener("storage", refreshDisabled);

export function resolveIntegration(ctx: ActiveContext): Integration | null {
  if (!ctx.app && !ctx.title) return null;
  return sorted.find((i) => !disabled.has(i.id) && i.matches(ctx)) ?? null;
}

export function allIntegrations(): readonly Integration[] {
  return sorted;
}

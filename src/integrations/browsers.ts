import type { ActiveContext, Integration } from "./types";

const BROWSER_RE = /chrome|edge|firefox|brave|opera|arc|vivaldi|zen|safari/i;
const isBrowser = (ctx: ActiveContext) => BROWSER_RE.test(ctx.app);

const STREAMING: Array<{ re: RegExp; name: string }> = [
  { re: /youtube(?! music)/i, name: "YouTube" },
  { re: /netflix/i, name: "Netflix" },
  { re: /twitch/i, name: "Twitch" },
  { re: /prime video/i, name: "Prime Video" },
  { re: /disney\+?/i, name: "Disney+" },
  { re: /hulu|crunchyroll|hotstar/i, name: "Streaming" },
];

const WEB_MUSIC: Array<{ re: RegExp; name: string }> = [
  { re: /youtube music/i, name: "YouTube Music" },
  { re: /spotify/i, name: "Spotify" },
  { re: /soundcloud/i, name: "SoundCloud" },
  { re: /apple music/i, name: "Apple Music" },
];

/** 🍿 Watching something in a browser tab. */
export const webVideo: Integration = {
  id: "web-video",
  name: "Movie Night",
  priority: 9,
  state: "watching",
  matches: (ctx) => isBrowser(ctx) && STREAMING.some((s) => s.re.test(ctx.title)),
  label: (ctx) => `Watching · ${STREAMING.find((s) => s.re.test(ctx.title))?.name ?? "Video"}`,
  apps: STREAMING.map((s) => s.name),
};

/** 🎧 Music in a browser tab. */
export const webMusic: Integration = {
  id: "web-music",
  name: "Web Music",
  priority: 9,
  state: "vibing",
  matches: (ctx) => isBrowser(ctx) && WEB_MUSIC.some((s) => s.re.test(ctx.title)),
  label: (ctx) => `Vibing · ${WEB_MUSIC.find((s) => s.re.test(ctx.title))?.name ?? "Music"}`,
  apps: WEB_MUSIC.map((s) => s.name),
};

/** 🔍 Plain browsing — the lowest-priority catch-all for browsers. */
export const browsing: Integration = {
  id: "browsing",
  name: "Browsing",
  priority: 1,
  state: "browsing",
  matches: isBrowser,
  label: () => "Browsing",
  apps: ["Chrome", "Edge", "Firefox", "Brave", "Arc", "Safari"],
};

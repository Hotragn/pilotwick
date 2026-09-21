import type { ActiveContext, Integration } from "./types";

/**
 * Example community integration: the companion vibes when Spotify is focused.
 * Copy this file as the template for your own integration PR.
 */
export const spotify: Integration = {
  id: "spotify",
  name: "Spotify Vibes",
  priority: 5,
  state: "vibing",
  matches: (ctx: ActiveContext) => /spotify/i.test(`${ctx.app} ${ctx.title}`),
  label: () => "Vibing · Spotify",
  apps: ["Spotify"],
};

import type { Integration } from "./types";

export const gaming: Integration = {
  id: "gaming",
  name: "Gaming",
  priority: 7,
  state: "gaming",
  matches: (ctx) =>
    /steam|epic games|riot client|league of legends|valorant|minecraft|roblox|battle\.net|gog galaxy|xbox/i.test(
      `${ctx.app} ${ctx.title}`
    ),
  label: () => "Gaming 🎮",
  apps: ["Steam", "Epic Games", "Riot", "Minecraft", "Roblox", "Xbox"],
};

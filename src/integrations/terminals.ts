import type { Integration } from "./types";

/**
 * Terminals count as coding. Matches on the app name only — window titles
 * mention "terminal" too often to be trusted. (A Claude Code session in a
 * terminal is caught by the higher-priority aiTools title match instead.)
 */
export const terminals: Integration = {
  id: "terminals",
  name: "Terminal",
  priority: 9,
  state: "coding",
  matches: (ctx) =>
    /windows ?terminal|wezterm|alacritty|kitty|konsole|iterm|powershell|ghostty|cmd\.exe/i.test(ctx.app),
  label: () => "Coding · Terminal",
  apps: ["Windows Terminal", "WezTerm", "Alacritty", "iTerm", "PowerShell", "Ghostty"],
};

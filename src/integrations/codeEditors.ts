import type { ActiveContext, Integration } from "./types";

const EDITOR_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /visual studio code|vs ?code|^code$/i, name: "VS Code" },
  { re: /^cursor$/i, name: "Cursor" },
  { re: /vscodium/i, name: "VSCodium" },
  { re: /jetbrains|intellij|webstorm|pycharm|rider|clion/i, name: "JetBrains" },
  { re: /neovim|nvim|^vim$/i, name: "Vim" },
  { re: /zed/i, name: "Zed" },
  { re: /sublime/i, name: "Sublime" },
];

function detect(ctx: ActiveContext) {
  return (
    EDITOR_PATTERNS.find((p) => p.re.test(ctx.app)) ??
    EDITOR_PATTERNS.find((p) => p.re.test(ctx.title)) ??
    null
  );
}

export const codeEditors: Integration = {
  id: "code-editors",
  name: "Coding Mode",
  priority: 10,
  state: "coding",
  matches: (ctx) => detect(ctx) !== null,
  label: (ctx) => `Coding · ${detect(ctx)?.name ?? "Editor"}`,
  apps: EDITOR_PATTERNS.map((p) => p.name),
};

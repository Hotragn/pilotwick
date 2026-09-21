import type { Integration } from "./types";

export const docs: Integration = {
  id: "docs",
  name: "Writing",
  priority: 3,
  state: "writing",
  matches: (ctx) =>
    /\bword\b|excel|powerpoint|onenote|notion|obsidian|google docs|google sheets|overleaf|\.pdf|acrobat/i.test(
      `${ctx.app} ${ctx.title}`
    ),
  label: () => "Writing ✍️",
  apps: ["Word", "Notion", "Obsidian", "Google Docs", "Overleaf", "PDFs"],
};

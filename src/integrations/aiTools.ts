import type { ActiveContext, Integration } from "./types";

/** Matches AI assistants whether they're a native app or a browser tab. */
const AI_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /claude/i, name: "Claude" },
  { re: /chatgpt|openai/i, name: "ChatGPT" },
  { re: /gemini/i, name: "Gemini" },
  { re: /copilot/i, name: "Copilot" },
  { re: /perplexity/i, name: "Perplexity" },
  { re: /midjourney/i, name: "Midjourney" },
];

function detect(ctx: ActiveContext) {
  const haystack = `${ctx.app} ${ctx.title}`;
  return AI_PATTERNS.find((p) => p.re.test(haystack)) ?? null;
}

export const aiTools: Integration = {
  id: "ai-tools",
  name: "AI Sync",
  // Beats code editors so a Claude tab inside Cursor still reads as AI.
  priority: 20,
  state: "ai-sync",
  matches: (ctx) => detect(ctx) !== null,
  label: (ctx) => `AI Sync · ${detect(ctx)?.name ?? "AI"}`,
  apps: AI_PATTERNS.map((p) => p.name),
};

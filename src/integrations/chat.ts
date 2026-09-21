import type { ActiveContext, Integration } from "./types";

const CHAT_APPS: Array<{ re: RegExp; name: string }> = [
  { re: /discord/i, name: "Discord" },
  { re: /slack/i, name: "Slack" },
  { re: /teams/i, name: "Teams" },
  { re: /whatsapp/i, name: "WhatsApp" },
  { re: /telegram/i, name: "Telegram" },
  { re: /messenger/i, name: "Messenger" },
  { re: /\bzoom\b/i, name: "Zoom" },
];

function detect(ctx: ActiveContext) {
  const haystack = `${ctx.app} ${ctx.title}`;
  return CHAT_APPS.find((c) => c.re.test(haystack)) ?? null;
}

export const chat: Integration = {
  id: "chat",
  name: "Chatting",
  priority: 6,
  state: "chatting",
  matches: (ctx) => detect(ctx) !== null,
  label: (ctx) => `Chatting · ${detect(ctx)?.name ?? "Chat"}`,
  apps: CHAT_APPS.map((c) => c.name),
};

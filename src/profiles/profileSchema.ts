/**
 * Custom Companion Profile — a single shareable JSON file with every asset
 * bundled inline as a data URL. Drop it in Discord, a Gist, or a PR to the
 * community gallery and anyone can import it in one click.
 */

export interface GifAsset {
  kind: "gif"; // any <img>-renderable image: gif, png, webp, apng…
  data: string; // data URL
}

export interface SpriteAsset {
  kind: "sprite";
  data: string; // data URL of the sheet
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  /** Frames per row; 0/undefined means a single horizontal strip. */
  columns?: number;
}

export type StateAsset = GifAsset | SpriteAsset;

export interface CompanionProfile {
  schema: 1;
  meta: {
    name: string;
    author: string;
    description?: string;
    createdAt: string; // ISO date
  };
  /** State id → asset. `idle` is required; everything else falls back to it. */
  states: Record<string, StateAsset>;
}

/** The states the Studio UI offers for mapping (integrations may add more). */
export const STATE_INFO = [
  { id: "idle", name: "Idle", emoji: "🙂", required: true, hint: "Default look. Required." },
  { id: "petting", name: "Petting", emoji: "🥰", required: false, hint: "While you hover it with your cursor." },
  { id: "sleeping", name: "Sleeping", emoji: "😴", required: false, hint: "After ~90s of inactivity." },
  { id: "typing", name: "Typing", emoji: "⌨️", required: false, hint: "While you type, anywhere." },
  { id: "overheat", name: "Overheat", emoji: "🔥", required: false, hint: "Typing way too fast!" },
  { id: "hunting", name: "Mouse Hunt", emoji: "🎯", required: false, hint: "Fast cursor movement." },
  { id: "stretching", name: "Stretching", emoji: "🧘", required: false, hint: "Stretch reminder time." },
  { id: "waking", name: "Waking up", emoji: "🥱", required: false, hint: "Yawn after a nap." },
  { id: "playing", name: "Playing", emoji: "🧶", required: false, hint: "While you scroll." },
  { id: "grumpy", name: "Grumpy", emoji: "🙀", required: false, hint: "Git merge conflict!" },
  { id: "ai-sync", name: "AI Thinking", emoji: "🤖", required: false, hint: "Claude / ChatGPT / Cursor focused." },
  { id: "celebrating", name: "Agent Done", emoji: "🎉", required: false, hint: "AI task finished!" },
  { id: "coding", name: "Coding", emoji: "👩‍💻", required: false, hint: "Editors & terminals focused." },
  { id: "vibing", name: "Music", emoji: "🎧", required: false, hint: "Spotify / YouTube Music." },
  { id: "watching", name: "Watching", emoji: "🍿", required: false, hint: "YouTube / Netflix / Twitch." },
  { id: "gaming", name: "Gaming", emoji: "🎮", required: false, hint: "Steam / games focused." },
  { id: "chatting", name: "Chatting", emoji: "💬", required: false, hint: "Discord / Slack / WhatsApp." },
  { id: "designing", name: "Designing", emoji: "🎨", required: false, hint: "Figma / Photoshop / Blender." },
  { id: "writing", name: "Writing", emoji: "✍️", required: false, hint: "Word / Notion / Docs." },
  { id: "browsing", name: "Browsing", emoji: "🔍", required: false, hint: "Any other browser tab." },
] as const;

export function validateProfile(value: unknown): CompanionProfile {
  const p = value as CompanionProfile;
  if (!p || typeof p !== "object") throw new Error("Not a JSON object.");
  if (p.schema !== 1) throw new Error(`Unsupported schema version: ${String(p.schema)}`);
  if (!p.meta?.name) throw new Error("Profile is missing meta.name.");
  if (!p.states || typeof p.states !== "object") throw new Error("Profile has no states.");
  if (!p.states["idle"]) throw new Error("Profile must include an 'idle' asset.");

  for (const [state, asset] of Object.entries(p.states)) {
    if (!asset.data?.startsWith("data:image/"))
      throw new Error(`State '${state}' has no bundled image data.`);
    if (asset.kind === "sprite") {
      const ok =
        asset.frameWidth > 0 && asset.frameHeight > 0 && asset.frames > 0 && asset.fps > 0;
      if (!ok) throw new Error(`State '${state}' has invalid sprite settings.`);
    } else if (asset.kind !== "gif") {
      throw new Error(`State '${state}' has unknown asset kind.`);
    }
  }
  return p;
}

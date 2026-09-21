/**
 * The built-in emotional states. Custom profiles may also map assets to any
 * extra string state an integration emits — unknown states fall back to idle.
 */
export type CompanionState =
  | "idle"
  | "sleeping"
  | "typing"
  | "ai-sync"
  | "coding"
  | "celebrating"
  | "vibing"
  | (string & {});

export interface ActiveContext {
  /** Process/app name reported by the OS, e.g. "Code", "chrome". */
  app: string;
  /** Focused window title, e.g. "Claude - Google Chrome". */
  title: string;
}

/**
 * An integration teaches the companion to recognize an app and feel something
 * about it. Add a file in `src/integrations/`, register it in `registry.ts`,
 * and you're done — no Rust required.
 */
export interface Integration {
  id: string;
  name: string;
  /** Higher priority wins when several integrations match at once. */
  priority: number;
  /** The state the companion enters while this context is focused. */
  state: CompanionState;
  matches(ctx: ActiveContext): boolean;
  /** Short badge text shown near the pet, e.g. "AI Sync · Claude". */
  label(ctx: ActiveContext): string;
  /**
   * A few recognisable app names for the Studio's integration list, so users
   * can see what a toggle actually covers. Optional — matching never uses it.
   */
  apps?: string[];
}

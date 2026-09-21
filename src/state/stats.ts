/**
 * Daily activity stats — everything stays in localStorage, nothing leaves
 * the machine. The overlay accumulates time-per-state; the Studio shows a
 * "today with your companion" panel.
 */

export interface DayStats {
  stateMs: Record<string, number>;
  aiSessions: number;
  commits: number;
}

const EMPTY: DayStats = { stateMs: {}, aiSessions: 0, commits: 0 };

/** Local date, not UTC — "today" should match the user's calendar. */
function dayId(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const key = (id = dayId()) => `pilotwick.stats.${id}`;

function loadDay(id: string): DayStats {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(key(id)) ?? "{}") };
  } catch {
    return EMPTY;
  }
}

export function loadToday(): DayStats {
  return loadDay(dayId());
}

export interface DayEntry {
  /** YYYY-MM-DD */
  id: string;
  /** Single-letter weekday for the chart axis. */
  short: string;
  stats: DayStats;
}

/** The last `days` days, oldest first — the Studio's activity chart. */
export function loadRecent(days = 7): DayEntry[] {
  const out: DayEntry[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const date = new Date();
    date.setDate(date.getDate() - back);
    const id = dayId(date);
    out.push({
      id,
      short: date.toLocaleDateString([], { weekday: "narrow" }),
      stats: loadDay(id),
    });
  }
  return out;
}

/** Everything the companion has recorded, wiped in one click. */
export function clearAllStats() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("pilotwick.stats.")) localStorage.removeItem(k);
  }
}

function save(stats: DayStats) {
  localStorage.setItem(key(), JSON.stringify(stats));
}

export function bumpState(state: string, ms: number) {
  const s = loadToday();
  s.stateMs[state] = (s.stateMs[state] ?? 0) + ms;
  save(s);
}

export function bumpCounter(counter: "aiSessions" | "commits") {
  const s = loadToday();
  s[counter] += 1;
  save(s);
}

export function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

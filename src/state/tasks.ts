import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";

/**
 * The companion's to-do list.
 *
 * This is what turns the pet from decoration into something you keep around:
 * it holds a handful of things you asked it to remember, shows the count on
 * its collar, nudges you when one comes due, and lets you tick items off from
 * the quick-action ring without opening a single window.
 */

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  /** Epoch ms for a nudge, or null for "just remember this". */
  dueAt: number | null;
  /** Set once the pet has reminded you, so it only nags once. */
  reminded: boolean;
}

const KEY = "pilotwick.tasks";
const EVENT = "companion://tasks-updated";
/** Keep the list small on purpose — a pet's memory, not a project tracker. */
export const MAX_TASKS = 25;

export function loadTasks(): Task[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Task[]) : [];
  } catch {
    return [];
  }
}

async function write(tasks: Task[]): Promise<Task[]> {
  localStorage.setItem(KEY, JSON.stringify(tasks.slice(0, MAX_TASKS)));
  await emit(EVENT).catch(() => {});
  return tasks;
}

export async function addTask(text: string, dueAt: number | null = null) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const task: Task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed.slice(0, 120),
    done: false,
    createdAt: Date.now(),
    dueAt,
    reminded: false,
  };
  await write([task, ...loadTasks()]);
}

export async function toggleTask(id: string) {
  await write(loadTasks().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}

export async function removeTask(id: string) {
  await write(loadTasks().filter((t) => t.id !== id));
}

export async function clearDone() {
  await write(loadTasks().filter((t) => !t.done));
}

/** Marks reminders as delivered so the pet doesn't repeat itself. */
export async function markReminded(ids: string[]) {
  if (ids.length === 0) return;
  await write(loadTasks().map((t) => (ids.includes(t.id) ? { ...t, reminded: true } : t)));
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.done);
}

/** Tasks whose reminder time has passed and that haven't been nudged yet. */
export function dueTasks(tasks: Task[], now = Date.now()): Task[] {
  return tasks.filter((t) => !t.done && !t.reminded && t.dueAt !== null && t.dueAt <= now);
}

export function useTasks(): Task[] {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  useEffect(() => {
    const refresh = () => setTasks(loadTasks());
    const un = listen(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      un.then((fn) => fn());
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return tasks;
}

/** "in 25m" / "tomorrow 09:00" / "overdue" — short enough for a speech bubble. */
export function formatDue(dueAt: number | null, now = Date.now()): string {
  if (dueAt === null) return "";
  const diff = dueAt - now;
  if (diff < 0) return "overdue";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return new Date(dueAt).toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

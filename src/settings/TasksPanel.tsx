import { useState } from "react";
import {
  addTask,
  clearDone,
  formatDue,
  MAX_TASKS,
  removeTask,
  toggleTask,
  useTasks,
} from "../state/tasks";
import { Button, Card, Field, inputClass, PanelHeader } from "./ui";

/**
 * The full task list. The overlay's dock handles capture-and-tick; this is
 * where you set real reminder times and clear out the backlog.
 */

/** `datetime-local` wants a local-time string, not an ISO/UTC one. */
function toLocalInput(ms: number): string {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export default function TasksPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const tasks = useTasks();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const full = tasks.length >= MAX_TASKS;

  const submit = async () => {
    if (!text.trim() || full) return;
    await addTask(text, due ? new Date(due).getTime() : null);
    setText("");
    setDue("");
    onFlash("Task added — your companion will hold onto it");
  };

  return (
    <div>
      <PanelHeader
        title="Tasks & reminders"
        blurb="A short list your companion carries for you, and nudges you about when it comes due."
      />

      <div className="space-y-5">
        <Card title="Add a task" blurb="Leave the time empty to just remember it quietly.">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label="What should it remember?">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. Reply to the design review thread"
                  maxLength={120}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="w-[220px]">
              <Field label="Nudge me at">
                <input
                  type="datetime-local"
                  value={due}
                  min={toLocalInput(Date.now())}
                  onChange={(e) => setDue(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Button variant="primary" onClick={submit} disabled={!text.trim() || full}>
              Add task
            </Button>
          </div>
          {full && (
            <p className="mt-3 text-xs text-amber-300">
              The list is capped at {MAX_TASKS} — tick a few off to make room. A pet keeps a
              short memory on purpose.
            </p>
          )}
        </Card>

        <Card
          title={`Open (${open.length})`}
          blurb={open.length === 0 ? "Nothing pending. Your companion is relaxed." : undefined}
        >
          <ul className="divide-y divide-slate-800">
            {open.map((t) => {
              const overdue = t.dueAt !== null && t.dueAt <= Date.now();
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleTask(t.id)}
                    className="h-4 w-4 shrink-0 accent-teal-500"
                    aria-label={`Mark "${t.text}" done`}
                  />
                  <span className="flex-1 truncate text-sm text-slate-100">{t.text}</span>
                  {t.dueAt !== null && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        overdue
                          ? "bg-rose-950/60 text-rose-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {overdue ? "⏰ " : ""}
                      {formatDue(t.dueAt)}
                    </span>
                  )}
                  <button
                    onClick={() => removeTask(t.id)}
                    title="Delete"
                    className="shrink-0 text-xs text-slate-600 hover:text-rose-300"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {done.length > 0 && (
          <Card
            title={`Done (${done.length})`}
            action={
              <Button
                onClick={async () => {
                  await clearDone();
                  onFlash("Cleared completed tasks");
                }}
              >
                Clear completed
              </Button>
            }
          >
            <ul className="divide-y divide-slate-800">
              {done.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleTask(t.id)}
                    className="h-4 w-4 shrink-0 accent-teal-500"
                    aria-label={`Reopen "${t.text}"`}
                  />
                  <span className="flex-1 truncate text-sm text-slate-500 line-through">
                    {t.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

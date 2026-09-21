import { useEffect } from "react";
import { useCompanionStore } from "./companionStore";
import { notify } from "./notify";
import { playCue } from "./sound";
import { dueTasks, loadTasks, markReminded } from "./tasks";
import { loadConfig } from "./wellness";

/** How often to look for tasks that have come due. */
const CHECK_EVERY_MS = 15_000;

/**
 * Turns due tasks into a nudge from the pet: a speech bubble, an optional
 * chirp, and a native notification for when the pet is hidden or covered.
 * Runs once, in the overlay window.
 */
export function useReminderLoop() {
  useEffect(() => {
    const check = async () => {
      const due = dueTasks(loadTasks());
      if (due.length === 0) return;

      const { name } = loadConfig();
      const who = name ? `${name}, ` : "";
      const [first] = due;
      const extra = due.length > 1 ? ` (+${due.length - 1} more)` : "";

      useCompanionStore.getState().say(`${who}${first.text}${extra} ⏰`, 12_000);
      playCue("alert");
      await notify(
        due.length > 1 ? `${due.length} reminders` : "Reminder",
        `${first.text}${extra}`
      );
      await markReminded(due.map((t) => t.id));
    };

    void check();
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, []);
}

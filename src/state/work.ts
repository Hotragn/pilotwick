import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useCompanionStore } from "./companionStore";
import { notify } from "./notify";

/**
 * Ambient work status.
 *
 * The pet stops being decoration the moment it can tell you CI went red
 * without you alt-tabbing. Rust reports the raw facts on `companion://work`;
 * this is where they turn into a mood, a chip and — for the things you would
 * genuinely want interrupting for — a notification.
 */

export interface WorkEvent {
  kind: "ci" | "review" | "dirty";
  status: string;
  detail: string;
  count: number;
}

export interface WorkStatus {
  ci: "running" | "passed" | "failed" | null;
  branch: string;
  /** Open PRs waiting on your review. */
  reviews: number;
  /** Changed files in the working tree. */
  dirty: number;
}

const EMPTY: WorkStatus = { ci: null, branch: "", reviews: 0, dirty: 0 };

/** A pile this big is worth mentioning; below it, the pet stays quiet. */
const DIRTY_NAG_AT = 25;

function reduce(prev: WorkStatus, e: WorkEvent): WorkStatus {
  switch (e.kind) {
    case "ci":
      return {
        ...prev,
        ci: e.status === "none" ? null : (e.status as WorkStatus["ci"]),
        branch: e.detail || prev.branch,
      };
    case "review":
      return { ...prev, reviews: e.count };
    case "dirty":
      return { ...prev, dirty: e.count };
    default:
      return prev;
  }
}

/**
 * Runs once, in the overlay window: keeps the status and reacts to changes.
 */
export function useWorkStatus(): WorkStatus {
  const [status, setStatus] = useState<WorkStatus>(EMPTY);

  useEffect(() => {
    const un = listen<WorkEvent>("companion://work", ({ payload }) => {
      setStatus((prev) => {
        const next = reduce(prev, payload);
        const store = useCompanionStore.getState();

        if (payload.kind === "ci" && next.ci !== prev.ci) {
          const where = next.branch ? ` on ${next.branch}` : "";
          if (next.ci === "failed") {
            store.hiss();
            store.say(`CI is red${where} 🔴`, 10_000);
            void notify("CI failed", `The latest run${where} did not pass.`);
          } else if (next.ci === "passed" && prev.ci === "running") {
            // Only celebrate a run you actually watched go green.
            store.celebrate("CI is green 🟢");
          }
        }

        if (payload.kind === "review" && payload.count > prev.reviews) {
          const n = payload.count;
          store.say(`${n} pull request${n > 1 ? "s" : ""} waiting on you 👀`, 10_000);
          void notify("Review requested", `${n} open PR${n > 1 ? "s" : ""} need your review.`);
        }

        if (
          payload.kind === "dirty" &&
          payload.count >= DIRTY_NAG_AT &&
          prev.dirty < DIRTY_NAG_AT
        ) {
          store.say(`${payload.count} files uncommitted 🌿`, 8000);
        }

        return next;
      });
    });
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  return status;
}

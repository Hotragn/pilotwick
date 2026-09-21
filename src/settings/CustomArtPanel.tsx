import { useEffect, useState } from "react";
import { applyProfile, exportProfile, importProfile, useProfile } from "../profiles/profileManager";
import { setMascot } from "../profiles/mascotChoice";
import { STATE_INFO, type CompanionProfile, type StateAsset } from "../profiles/profileSchema";
import StateUploadCard from "./UploadEngine";
import { Button, Card, Field, inputClass, PanelHeader } from "./ui";

/**
 * Build a companion out of your own art: one GIF or sprite sheet per mood,
 * exported as a single self-contained `.companion.json` anyone can import.
 */
export default function CustomArtPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const { profile } = useProfile();
  const [draft, setDraft] = useState<CompanionProfile>(
    () =>
      profile ?? {
        schema: 1,
        meta: { name: "My Companion", author: "", createdAt: new Date().toISOString() },
        states: {},
      }
  );
  const [hydrated, setHydrated] = useState(false);
  const [onlyMapped, setOnlyMapped] = useState(false);

  // The saved profile loads asynchronously (it lives in a file) — seed the
  // editor with it once, without clobbering in-progress edits later.
  useEffect(() => {
    if (profile && !hydrated) {
      setDraft(profile);
      setHydrated(true);
    }
  }, [profile, hydrated]);

  const setAsset = (stateId: string, asset: StateAsset | null) =>
    setDraft((d) => {
      const states = { ...d.states };
      if (asset) states[stateId] = asset;
      else delete states[stateId];
      return { ...d, states };
    });

  const mapped = Object.keys(draft.states).length;
  const canApply = !!draft.states["idle"];
  const cards = onlyMapped ? STATE_INFO.filter((s) => draft.states[s.id]) : STATE_INFO;

  return (
    <div>
      <PanelHeader
        title="Custom art"
        blurb="Upload a GIF or sprite sheet per mood. Unmapped moods fall back to Idle."
      />

      <div className="space-y-5">
        <Card
          title={`${draft.meta.name || "Untitled"} — ${mapped} of ${STATE_INFO.length} moods mapped`}
          blurb={
            canApply
              ? "Ready to apply. Export bundles every image inside one JSON file."
              : "Idle is the one required mood — add it to unlock Apply."
          }
          action={
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const imported = await importProfile().catch((e: Error) => {
                    onFlash(`Import failed: ${e.message}`);
                    return null;
                  });
                  if (imported) {
                    setDraft(imported);
                    setHydrated(true);
                    onFlash(`Imported "${imported.meta.name}"`);
                  }
                }}
              >
                Import
              </Button>
              <Button
                disabled={!canApply}
                onClick={async () => {
                  const path = await exportProfile(draft);
                  if (path) onFlash(`Exported to ${path}`);
                }}
              >
                Export & share
              </Button>
              <Button
                variant="primary"
                disabled={!canApply}
                onClick={async () => {
                  try {
                    await applyProfile(draft);
                    await setMascot("custom");
                    onFlash(`"${draft.meta.name}" is now your companion`);
                  } catch (e) {
                    onFlash(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Companion name">
              <input
                value={draft.meta.name}
                onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, name: e.target.value } })}
                className={inputClass}
              />
            </Field>
            <Field label="Author" hint="Credited if you share the profile.">
              <input
                value={draft.meta.author}
                placeholder="your GitHub handle"
                onChange={(e) =>
                  setDraft({ ...draft, meta: { ...draft.meta, author: e.target.value } })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Mood artwork</h3>
          <button
            onClick={() => setOnlyMapped((v) => !v)}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            {onlyMapped ? `Show all ${STATE_INFO.length}` : `Show mapped only (${mapped})`}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((info) => (
            <StateUploadCard
              key={info.id}
              info={info}
              asset={draft.states[info.id] ?? null}
              onChange={(asset) => setAsset(info.id, asset)}
            />
          ))}
        </div>

        <Card title="Back to a built-in mascot">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              Removes the custom profile and restores Pixel the cat. Export first if you want to
              keep your work.
            </p>
            <Button
              variant="danger"
              onClick={async () => {
                await applyProfile(null);
                await setMascot("pixel");
                onFlash("Back to the default cat");
              }}
            >
              Remove custom profile
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

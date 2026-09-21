import { allIntegrations } from "../integrations/registry";
import { prefs } from "../state/prefs";
import { STATE_INFO } from "../profiles/profileSchema";
import { Button, Card, PanelHeader, Toggle } from "./ui";

/**
 * Which apps the companion is allowed to react to.
 *
 * Reactions are the whole point of the pet, but "the whole point" stops
 * being charming when it announces your Netflix tab during a screen share —
 * so every one of them is individually switchable.
 */

const STATE_META = new Map(STATE_INFO.map((s) => [s.id as string, s]));

export default function IntegrationsPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const p = prefs.use();
  const disabled = new Set(p.disabledIntegrations);
  const integrations = allIntegrations();

  const setEnabled = async (id: string, enabled: boolean) => {
    const next = new Set(disabled);
    if (enabled) next.delete(id);
    else next.add(id);
    await prefs.patch({ disabledIntegrations: [...next] });
  };

  return (
    <div>
      <PanelHeader
        title="App reactions"
        blurb="Your companion recognises the focused window and changes mood. Switch off anything you would rather it ignored."
      />

      <div className="space-y-5">
        <Card
          title={`${integrations.length - disabled.size} of ${integrations.length} active`}
          blurb="Only the app name and window title are read, and they never leave this machine."
          action={
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await prefs.patch({ disabledIntegrations: [] });
                  onFlash("All reactions enabled");
                }}
              >
                Enable all
              </Button>
              <Button
                onClick={async () => {
                  await prefs.patch({
                    disabledIntegrations: integrations.map((i) => i.id),
                  });
                  onFlash("All reactions muted — the pet will just idle along");
                }}
              >
                Mute all
              </Button>
            </div>
          }
        >
          <ul className="divide-y divide-slate-800">
            {integrations.map((i) => {
              const meta = STATE_META.get(i.state as string);
              return (
                <li key={i.id} className="py-1">
                  <Toggle
                    label={`${meta?.emoji ?? "✨"}  ${i.name}`}
                    blurb={
                      i.apps?.length
                        ? `${i.apps.slice(0, 5).join(", ")}${i.apps.length > 5 ? "…" : ""} → ${
                            meta?.name ?? i.state
                          }`
                        : `Reacts with: ${meta?.name ?? i.state}`
                    }
                    checked={!disabled.has(i.id)}
                    onChange={(on) => setEnabled(i.id, on)}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Missing your app?">
          <p className="text-sm leading-relaxed text-slate-300">
            An integration is one small TypeScript file — a regex, a mood, and a label. Drop it
            in <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">src/integrations/</code>,
            add one line to{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">registry.ts</code>, and it
            shows up in this list automatically. No Rust, no rebuild plumbing — that is a
            complete, mergeable contribution.
          </p>
        </Card>
      </div>
    </div>
  );
}

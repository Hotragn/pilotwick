import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { loadWeatherConfig, saveWeatherConfig, type WeatherConfig } from "../state/weather";
import { prefs } from "../state/prefs";
import { Button, Card, Field, inputClass, PanelHeader, Toggle } from "./ui";

/**
 * Signals from outside the window manager: real weather, and the state of a
 * git repository. Both are opt-in, and weather is the only feature in Pilotwick
 * that touches the network at all.
 */
export default function WorldPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const [weather, setWeather] = useState<WeatherConfig>(loadWeatherConfig);
  const [gitRepo, setGitRepo] = useState<string>(() => localStorage.getItem("pilotwick.gitrepo") ?? "");
  const p = prefs.use();

  return (
    <div>
      <PanelHeader
        title="Your world"
        blurb="Let the companion react to the weather outside and the repo you are working in."
      />

      <div className="space-y-5">
        <Card
          title="Weather moods"
          blurb="Rain falls around the pet, snow settles on it, and it sulks in a heatwave."
        >
          <Toggle
            label="Enable weather"
            blurb="Uses the free Open-Meteo API. Your city name is the only thing that leaves the machine — and it is the only network call Pilotwick ever makes."
            checked={weather.enabled}
            onChange={async (v) => {
              const next = { ...weather, enabled: v };
              setWeather(next);
              await saveWeatherConfig(next);
            }}
          />
          {weather.enabled && (
            <div className="mt-3 max-w-sm">
              <Field label="City">
                <input
                  value={weather.city}
                  placeholder="e.g. Hyderabad"
                  onChange={(e) => setWeather({ ...weather, city: e.target.value })}
                  onBlur={async () => {
                    await saveWeatherConfig(weather);
                    if (weather.city) onFlash(`Watching the weather in ${weather.city}`);
                  }}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </Card>

        <Card
          title="Work status"
          blurb="Turn the pet into a peripheral monitor: it shows a chip when CI is red or running, and speaks up when a pull request is waiting on your review."
        >
          <Toggle
            label="Watch CI, reviews and uncommitted work"
            blurb={
              gitRepo
                ? "Uses the git and gh command-line tools you already have. Read-only, and nothing is sent anywhere Pilotwick controls."
                : "Pick a repository below first — this watches the same one."
            }
            checked={p.workStatus}
            onChange={async (v) => {
              await prefs.patch({ workStatus: v });
              onFlash(v ? "Watching CI and review requests" : "Work status off");
            }}
          />
          {p.workStatus && !gitRepo && (
            <p className="mt-2 text-xs text-amber-300">
              No repository picked yet, so there is nothing to watch.
            </p>
          )}
        </Card>

        <Card
          title="Git reactions"
          blurb="Celebrates commits, announces branch switches, and hisses at merge conflicts."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={async () => {
                const dir = await open({ directory: true, title: "Pick a git repository" });
                if (!dir || Array.isArray(dir)) return;
                localStorage.setItem("pilotwick.gitrepo", dir);
                setGitRepo(dir);
                await invoke("set_git_repo", { path: dir });
                onFlash("Watching that repo for commits and conflicts");
              }}
            >
              {gitRepo ? "Change repository" : "Pick a repository"}
            </Button>
            {gitRepo && (
              <>
                <code className="max-w-[360px] truncate rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-400">
                  {gitRepo}
                </code>
                <Button
                  variant="danger"
                  onClick={async () => {
                    localStorage.removeItem("pilotwick.gitrepo");
                    setGitRepo("");
                    await invoke("set_git_repo", { path: null });
                    onFlash("Git watching disabled");
                  }}
                >
                  Stop watching
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

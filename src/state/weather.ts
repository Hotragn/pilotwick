import { useEffect, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { useCompanionStore } from "./companionStore";

/**
 * Weather moods (opt-in). Uses the free Open-Meteo API — no API key, no
 * account. This is the ONLY network feature in the app and it stays off
 * until the user enables it and types a city.
 */

export interface WeatherConfig {
  enabled: boolean;
  city: string;
}

export type WeatherKind = "clear" | "clouds" | "rain" | "snow" | "hot" | "cold";

export interface WeatherNow {
  tempC: number;
  kind: WeatherKind;
  city: string;
}

const KEY = "pilotwick.weather";
const EVENT = "companion://weather-updated";
const REFRESH_MS = 20 * 60_000;

export function loadWeatherConfig(): WeatherConfig {
  try {
    return { enabled: false, city: "", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { enabled: false, city: "" };
  }
}

export async function saveWeatherConfig(config: WeatherConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
  await emit(EVENT);
}

function kindFrom(code: number, tempC: number): WeatherKind {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rain";
  if (tempC >= 35) return "hot";
  if (tempC <= 5) return "cold";
  if (code <= 1) return "clear";
  return "clouds";
}

async function fetchWeather(city: string): Promise<WeatherNow | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geo = await geoRes.json();
    const place = geo?.results?.[0];
    if (!place) return null;

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`
    );
    const wx = await wxRes.json();
    const tempC = Math.round(wx?.current?.temperature_2m ?? 0);
    const code = wx?.current?.weather_code ?? 0;
    return { tempC, kind: kindFrom(code, tempC), city: place.name };
  } catch {
    return null; // offline or API hiccup — the pet just doesn't know the weather
  }
}

const MOOD_BUBBLES: Partial<Record<WeatherKind, (t: number) => string>> = {
  hot: (t) => `${t}°C outside — stay hydrated! 🥤`,
  cold: (t) => `Brrr, ${t}°C 🧣`,
  rain: () => "Rainy day outside ☔",
  snow: () => "It's snowing! ⛄",
};

/** Mount once in the overlay: fetches weather and nudges via bubbles. */
export function useWeather(): WeatherNow | null {
  const [now, setNow] = useState<WeatherNow | null>(null);
  const lastKind = useRef<WeatherKind | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const refresh = async () => {
      const config = loadWeatherConfig();
      if (!config.enabled || !config.city.trim()) {
        setNow(null);
        lastKind.current = null;
        return;
      }
      const wx = await fetchWeather(config.city.trim());
      if (cancelled || !wx) return;
      setNow(wx);
      if (wx.kind !== lastKind.current) {
        lastKind.current = wx.kind;
        const line = MOOD_BUBBLES[wx.kind];
        if (line) useCompanionStore.getState().say(line(wx.tempC), 6000);
      }
    };

    refresh();
    timer = setInterval(refresh, REFRESH_MS);
    const un = listen(EVENT, refresh);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      un.then((fn) => fn());
    };
  }, []);

  return now;
}

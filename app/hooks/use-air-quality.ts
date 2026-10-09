
"use client";

import { useEffect, useState } from "react";

export type ForecastPoint = {
  time: string;
  pm25: number;
};

type HourlyForecastPoint = {
  time: string;
  pm25: number | null;
};

type ForecastResponse = {
  location: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  timezone: string;
  unit: string;
  forecast: HourlyForecastPoint[];
};

type AirQualityState = {
  forecast: ForecastPoint[];
  forecastDate: string | null;
  loading: boolean;
  error: string | null;
  source: string | null;
  fetchedAt: string | null;
  location: string | null;
};

function getDelhiDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function interpolateForecast(
  hourly: HourlyForecastPoint[]
): ForecastPoint[] {
  const result: ForecastPoint[] = [];

  for (let i = 0; i < hourly.length - 1; i++) {
    const current = hourly[i];
    const next = hourly[i + 1];

    if (
      typeof current.pm25 !== "number" ||
      typeof next.pm25 !== "number" ||
      !Number.isFinite(current.pm25) ||
      !Number.isFinite(next.pm25)
    ) {
      continue;
    }

    // Open-Meteo returns local timestamps for Asia/Kolkata.
    const start = new Date(
      `${current.time}:00+05:30`
    ).getTime();

    const end = new Date(
      `${next.time}:00+05:30`
    ).getTime();

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    ) {
      continue;
    }

    const intervalMinutes = (end - start) / 60000;

    for (
      let minutes = 0;
      minutes < intervalMinutes;
      minutes += 15
    ) {
      const fraction = minutes / intervalMinutes;

      const timestamp = new Date(
        start + minutes * 60000
      );

      const time = timestamp.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const pm25 =
        current.pm25 +
        (next.pm25 - current.pm25) * fraction;

      result.push({
        time,
        pm25: Math.round(pm25 * 10) / 10,
      });
    }
  }

  const last = hourly[hourly.length - 1];

  if (
    last &&
    typeof last.pm25 === "number" &&
    Number.isFinite(last.pm25)
  ) {
    result.push({
      time: last.time.slice(11, 16),
      pm25: last.pm25,
    });
  }

  return result;
}

export function useAirQuality(): AirQualityState {
  const [state, setState] = useState<AirQualityState>({
    forecast: [],
    forecastDate: null,
    loading: true,
    error: null,
    source: null,
    fetchedAt: null,
    location: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadForecast() {
      try {
        const response = await fetch("/api/forecast", {
          signal: controller.signal,
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Failed to load forecast."
          );
        }

        const payload = data as ForecastResponse;

        if (!Array.isArray(payload.forecast)) {
          throw new Error("The forecast response is invalid.");
        }

        // Keep the forecast for one school day only.
        const today = getDelhiDate();

        const availableDates = [
          ...new Set(
            payload.forecast.map((point) => point.time.slice(0, 10))
          ),
        ].sort();

        const selectedDate = availableDates.includes(today)
          ? today
          : availableDates[0];

        if (!selectedDate) {
          throw new Error("No forecast dates were returned.");
        }

        const selectedDay = payload.forecast
          .filter((point) => point.time.startsWith(selectedDate))
          .sort((a, b) => a.time.localeCompare(b.time));

        const interpolated = interpolateForecast(selectedDay);

        if (interpolated.length === 0) {
          throw new Error(
            "No valid PM2.5 values are available for the selected day."
          );
        }

        if (controller.signal.aborted) return;

        setState({
          forecast: interpolated,
          forecastDate: selectedDate,
          loading: false,
          error: null,
          source: payload.source,
          fetchedAt: payload.fetchedAt,
          location: payload.location,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          forecast: [],
          forecastDate: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load air-quality data.",
          source: null,
          fetchedAt: null,
          location: null,
        });
      }
    }

    loadForecast();

    return () => controller.abort();
  }, []);

  return state;
}

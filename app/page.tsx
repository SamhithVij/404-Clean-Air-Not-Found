"use client";

import { useEffect, useState } from "react";
import DayAtGlance from "./components/day-at-glance";
import OutdoorSchedule from "./components/outdoor-schedule";
import { useAirQuality } from "./hooks/use-air-quality";

export default function Home() {
  const { forecast, loading, error } = useAirQuality();
  const [currentHour, setCurrentHour] = useState<string | null>(null);

  // Calculate the current hour in India after the component mounts.
  useEffect(() => {
    const updateCurrentHour = () => {
      setCurrentHour(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(new Date())
      );
    };

    updateCurrentHour();

    // Keep the displayed hour accurate if the page stays open.
    const interval = window.setInterval(updateCurrentHour, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  // Match the current India-time hour to the forecast timestamps.

  const currentForecast = forecast.find((point) => {
  const time = point.time;

  if (!time) return false;

  // Forecast points use HH:mm, e.g. "00:15".
  // Find the point matching the current India-time hour.
  const forecastHour = time.includes("T")
    ? time.slice(11, 13)
    : time.slice(0, 2);

  return forecastHour === currentHour;
});

  const currentPm25 =
    !loading && !error && currentForecast
      ? Math.round(currentForecast.pm25)
      : null;

  return (
    <main className="min-h-screen bg-[#F8FAF7] text-[#172019]">
      {/* Header */}
      <header className="border-b border-[#DDE4DE]">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* Airwise logo */}
            <svg
              width="38"
              height="38"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M9 25.5L16 11L23 25.5"
                stroke="#20A878"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 25.5H29C33 25.5 35 22.8 35 19.5C35 16.2 32.4 13.5 29 13.5C27.9 13.5 26.9 13.8 26 14.3"
                stroke="#1597D3"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 25.5C5.7 25.5 4 27.5 4 30C4 32.5 6 34 9 34H29C32 34 34 32 34 29"
                stroke="#1597D3"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div>
              <div className="text-xl font-semibold tracking-tight">
                Airwise
              </div>
              <div className="text-[11px] tracking-[0.12em] text-[#59645C]">
                SCHOOL AIR QUALITY INTELLIGENCE
              </div>
            </div>
          </div>

          <div className="text-right text-xs">
            <div className="font-medium">TODAY · OCT 08</div>
            <div className="text-[#59645C]">GREENFIELD SCHOOL</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Hero */}
        <section className="flex items-center justify-between gap-12 py-16">
          <div className="max-w-[760px]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#2F8F5B]">
              AIR TODAY
            </p>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#172019]">
              A clearer plan for
              <br />
              outdoor time.
            </h1>

            <p className="mt-6 max-w-[700px] text-lg leading-8 text-[#59645C]">
              See which outdoor activities overlap with elevated air pollution
              and identify lower-exposure windows to consider.
            </p>

            <p className="mt-4 text-xs text-[#7A837C]">
              ↳ Planning support, not an automatic decision. You make the final
              call.
            </p>
          </div>

          {/* Current hourly PM2.5 forecast */}
          <div className="min-w-[190px] border-l border-[#DDE4DE] pl-10 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1597D3]">
              FORECAST · PM2.5
            </p>

            <div className="mt-3 text-5xl font-medium tracking-[-0.04em]">
              {loading
                ? "…"
                : currentPm25 !== null
                  ? currentPm25
                  : "—"}
              <span className="ml-2 text-lg font-normal text-[#59645C]">
                µg/m³
              </span>
            </div>

            <p className="mt-3 text-sm text-[#59645C]">
              {error
                ? "Forecast temporarily unavailable"
                : loading
                  ? "Loading forecast…"
                  : currentPm25 !== null
                    ? "Hourly PM2.5 forecast"
                    : "No forecast available for this hour"}
            </p>

            <p className="mt-2 text-sm text-[#59645C]">
              Open-Meteo · via AWS
            </p>
          </div>
        </section>

        {/* Air quality timeline */}
        <DayAtGlance />

        {/* Outdoor schedule + selected activity */}
        <OutdoorSchedule />
      </div>
    </main>
  );
}
